import { Router } from "express";
import { queryAll, queryOne, execute } from "../db/helpers.js";
import { v4 as uuid } from "uuid";
import {
  generateScale,
  generateArpeggio,
  generateIntervalDrill,
  generateArticulationDrill,
  generateFromDemand,
} from "../utils/ruleGenerator.js";
import { generateWithAI, estimateCost } from "../utils/aiGenerator.js";
import { enforceAiLimit } from "../middleware/tierLimits.js";

const router = Router();

// Helper: get user's instrument from DB
async function getUserInstrument(userId) {
  if (!userId || userId === "dev-user") return null;
  const user = await queryOne("SELECT instrument FROM users WHERE id = $1", [
    userId,
  ]);
  return user?.instrument || null;
}

// POST /generate/rule — Rule-based exercise generation
router.post("/generate/rule", async (req, res) => {
  try {
    const { type, params = {} } = req.body;
    if (!type)
      return res.status(400).json({
        error: "type is required (scale, arpeggio, interval, articulation)",
      });

    // Inject user's instrument if not specified
    if (!params.instrument) {
      params.instrument = await getUserInstrument(req.user?.id);
    }

    let result;
    switch (type) {
      case "scale":
        result = generateScale(params);
        break;
      case "arpeggio":
        result = generateArpeggio(params);
        break;
      case "interval":
        result = generateIntervalDrill(params);
        break;
      case "articulation":
        result = generateArticulationDrill(params);
        break;
      default:
        return res.status(400).json({ error: `Unknown type: ${type}` });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /generate/from-demand — Generate from a technical demand
router.post("/generate/from-demand", async (req, res) => {
  try {
    const { demand_id } = req.body;

    let demand;
    if (demand_id) {
      demand = await queryOne("SELECT * FROM technical_demands WHERE id = $1", [
        demand_id,
      ]);
      if (!demand) return res.status(404).json({ error: "Demand not found" });
    } else {
      demand = req.body;
    }

    // Try rule-based first
    const result = generateFromDemand(demand);
    if (result) {
      return res.json({ ...result, generation_method: "rule_based" });
    }

    // Fallback to AI if rule-based can't match
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(400).json({
        error:
          "Cannot generate: demand does not match rule-based patterns and ANTHROPIC_API_KEY is not configured",
      });
    }

    const instrument = await getUserInstrument(req.user.id);
    const aiResult = await generateWithAI({
      type: "custom_study",
      prompt: demand.description,
      context: {
        key: demand.key,
        difficulty: demand.difficulty,
        demands: demand.description,
      },
      user_id: req.user.id,
      instrument,
    });

    res.json(aiResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /generate/ai — AI-assisted generation (cost confirmation flow)
router.post("/generate/ai", enforceAiLimit, async (req, res) => {
  try {
    const { type, prompt, context = {}, confirmed } = req.body;
    if (!type || !prompt)
      return res.status(400).json({ error: "type and prompt are required" });

    if (!process.env.ANTHROPIC_API_KEY) {
      return res
        .status(400)
        .json({ error: "ANTHROPIC_API_KEY is not configured" });
    }

    // Cost estimation step — include usage info
    if (confirmed !== true) {
      return res.json({
        ...estimateCost(),
        requires_confirmation: true,
        ai_usage: req.aiUsage,
      });
    }

    const instrument = await getUserInstrument(req.user.id);
    const result = await generateWithAI({
      type,
      prompt,
      context,
      instrument,
      user_id: req.user.id,
    });

    // Track AI spend
    if (result.cost) {
      const existing = await queryOne(
        "SELECT * FROM settings WHERE key = 'ai_spend_total' AND user_id = $1",
        [req.user.id],
      );
      if (existing) {
        const newTotal = parseFloat(existing.value) + result.cost;
        await execute(
          "UPDATE settings SET value = $1, updated_at = NOW() WHERE key = 'ai_spend_total' AND user_id = $2",
          [String(newTotal), req.user.id],
        );
      } else {
        await execute(
          "INSERT INTO settings (key, value, user_id, updated_at) VALUES ('ai_spend_total', $1, $2, NOW())",
          [String(result.cost), req.user.id],
        );
      }
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /generate/save — Save a generated exercise to the library
router.post("/generate/save", async (req, res) => {
  try {
    const {
      title,
      abc,
      description,
      key,
      difficulty,
      tags = [],
      category_id,
      generation_method,
      prompt_used,
      demand_id,
    } = req.body;
    if (!title || !abc)
      return res.status(400).json({ error: "title and abc are required" });

    const id = uuid();
    const sourceType =
      generation_method === "claude_api" ? "generated_ai" : "generated_rule";
    const generationContext = JSON.stringify({
      generation_method: generation_method || "rule_based",
      prompt_used: prompt_used || null,
      triggered_by: demand_id || null,
    });

    await execute(
      "INSERT INTO exercises (id, user_id, title, source, source_type, category_id, key, difficulty, description, tags, notation_data, notation_format, generation_context) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)",
      [
        id,
        req.user.id,
        title,
        "Generated",
        sourceType,
        category_id || null,
        key || null,
        difficulty || null,
        description || "",
        JSON.stringify(tags),
        abc,
        "abc",
        generationContext,
      ],
    );

    // Link to demand if specified
    if (demand_id) {
      const demand = await queryOne(
        "SELECT * FROM technical_demands WHERE id = $1",
        [demand_id],
      );
      if (demand) {
        await execute(
          "INSERT INTO demand_exercises (demand_id, exercise_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [demand_id, id],
        );
      }
    }

    const exercise = await queryOne(
      "SELECT e.*, tc.name as category_name FROM exercises e LEFT JOIN taxonomy_categories tc ON e.category_id = tc.id WHERE e.id = $1 AND e.user_id = $2",
      [id, req.user.id],
    );
    res.status(201).json(exercise);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /generate/excerpt-prep — Generate excerpt preparation routine
router.post("/generate/excerpt-prep", enforceAiLimit, async (req, res) => {
  try {
    const { excerpt_id, confirmed } = req.body;

    const excerpt = await queryOne(
      "SELECT * FROM excerpts WHERE id = $1 AND user_id = $2",
      [excerpt_id, req.user.id],
    );
    if (!excerpt) return res.status(404).json({ error: "Excerpt not found" });

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(400).json({
        error: "ANTHROPIC_API_KEY is not configured for AI generation",
      });
    }

    if (confirmed !== true) {
      return res.json({
        ...estimateCost(),
        requires_confirmation: true,
        ai_usage: req.aiUsage,
      });
    }

    const instrument = await getUserInstrument(req.user.id);
    const result = await generateWithAI({
      type: "excerpt_prep",
      prompt: `${excerpt.title} by ${excerpt.composer}`,
      context: {
        title: excerpt.title,
        composer: excerpt.composer,
        difficulty: excerpt.difficulty,
        demands: excerpt.performance_notes || "",
      },
      user_id: req.user.id,
      instrument,
    });

    // Track cost
    if (result.cost) {
      const existing = await queryOne(
        "SELECT * FROM settings WHERE key = 'ai_spend_total' AND user_id = $1",
        [req.user.id],
      );
      if (existing) {
        const newTotal = parseFloat(existing.value) + result.cost;
        await execute(
          "UPDATE settings SET value = $1, updated_at = NOW() WHERE key = 'ai_spend_total' AND user_id = $2",
          [String(newTotal), req.user.id],
        );
      } else {
        await execute(
          "INSERT INTO settings (key, value, user_id, updated_at) VALUES ('ai_spend_total', $1, $2, NOW())",
          [String(result.cost), req.user.id],
        );
      }
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /generate/warmup — Generate session warm-up
router.post("/generate/warmup", enforceAiLimit, async (req, res) => {
  try {
    const { session_id, confirmed } = req.body;

    if (!process.env.ANTHROPIC_API_KEY) {
      return res
        .status(400)
        .json({ error: "ANTHROPIC_API_KEY is not configured" });
    }

    if (confirmed !== true) {
      return res.json({
        ...estimateCost(),
        requires_confirmation: true,
        ai_usage: req.aiUsage,
      });
    }

    // Gather session context
    let keys = [];
    let context = {};
    if (session_id) {
      const blocks = await queryAll(
        "SELECT * FROM session_blocks WHERE session_id = $1",
        [session_id],
      );
      // Gather keys from linked pieces
      for (const block of blocks) {
        if (block.linked_type === "piece" && block.linked_id) {
          const piece = await queryOne("SELECT * FROM pieces WHERE id = $1", [
            block.linked_id,
          ]);
          if (piece) {
            // Try to get key from analysis
            const files = await queryAll(
              "SELECT id FROM uploaded_files WHERE linked_type = $1 AND linked_id = $2",
              ["piece", piece.id],
            );
            for (const f of files) {
              const analysis = await queryOne(
                "SELECT key_signature FROM analysis_results WHERE file_id = $1 AND status = $2",
                [f.id, "complete"],
              );
              if (analysis?.key_signature) keys.push(analysis.key_signature);
            }
          }
        }
      }
      context = { keys: [...new Set(keys)], duration_min: 10 };
    }

    const instrument = await getUserInstrument(req.user.id);
    const result = await generateWithAI({
      type: "warmup",
      prompt:
        keys.length > 0
          ? `Warm up covering keys: ${keys.join(", ")}`
          : "General warm-up for a practice session",
      context,
      user_id: req.user.id,
      instrument,
    });

    if (result.cost) {
      const existing = await queryOne(
        "SELECT * FROM settings WHERE key = 'ai_spend_total' AND user_id = $1",
        [req.user.id],
      );
      if (existing) {
        const newTotal = parseFloat(existing.value) + result.cost;
        await execute(
          "UPDATE settings SET value = $1, updated_at = NOW() WHERE key = 'ai_spend_total' AND user_id = $2",
          [String(newTotal), req.user.id],
        );
      } else {
        await execute(
          "INSERT INTO settings (key, value, user_id, updated_at) VALUES ('ai_spend_total', $1, $2, NOW())",
          [String(result.cost), req.user.id],
        );
      }
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
