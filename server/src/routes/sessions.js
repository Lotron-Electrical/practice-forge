import { Router } from "express";
import { queryAll, queryOne, execute } from "../db/helpers.js";
import { v4 as uuid } from "uuid";
import { enforceSessionLimit } from "../middleware/tierLimits.js";

const router = Router();

// GET today's rotation
router.get("/rotation/today", async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  let rotation = await queryAll(
    "SELECT rl.*, e.title, e.composer, e.status, e.difficulty, e.full_work_title, e.location_in_score FROM excerpt_rotation_log rl JOIN excerpts e ON rl.excerpt_id = e.id WHERE rl.date = $1 AND rl.user_id = $2 ORDER BY rl.created_at",
    [today, req.user.id],
  );

  if (rotation.length === 0) {
    const countRow = await queryOne(
      "SELECT value FROM settings WHERE key = 'excerptRotationCount'",
    );
    const count = countRow ? JSON.parse(countRow.value) : 3;

    // Smart rotation: weighted scoring algorithm
    const excerpts = await queryAll(`
      SELECT e.*,
        COALESCE(e.last_practiced, '2000-01-01') as last_p
      FROM excerpts e
      WHERE e.user_id = $1
    `, [req.user.id]);

    // Score each excerpt
    const now = Date.now();
    const STATUS_WEIGHT = {
      needs_work: 40,
      acceptable: 25,
      solid: 10,
      audition_ready: 5,
    };
    const scored = excerpts.map((ex) => {
      const daysSince = Math.max(
        0,
        Math.floor((now - new Date(ex.last_p).getTime()) / 86400000),
      );
      // Staleness: more days = higher score (caps at 90 days for diminishing returns)
      const stalenessScore = Math.min(daysSince, 90) * 1.0;
      // Status: needs_work excerpts get practiced more
      const statusScore = STATUS_WEIGHT[ex.status] || 15;
      // Difficulty bonus: harder excerpts get slight priority
      const difficultyScore = (ex.difficulty || 5) * 1.5;
      // Audition urgency: if audition_date is set and approaching, massive boost
      let auditionBoost = 0;
      if (ex.audition_date) {
        const daysUntil = Math.floor(
          (new Date(ex.audition_date).getTime() - now) / 86400000,
        );
        if (daysUntil >= 0 && daysUntil <= 30) {
          auditionBoost = (30 - daysUntil) * 3; // max 90 points for tomorrow's audition
        }
      }
      return {
        ...ex,
        score: stalenessScore + statusScore + difficultyScore + auditionBoost,
      };
    });

    // Sort by score descending, then pick with difficulty spread
    scored.sort((a, b) => b.score - a.score);

    // Select with difficulty diversity: avoid picking all same difficulty
    const selected = [];
    const diffBuckets = new Set();
    // First pass: pick top-scored with different difficulty buckets
    for (const ex of scored) {
      if (selected.length >= count) break;
      const bucket = Math.ceil((ex.difficulty || 5) / 3); // 1-3, 4-6, 7-10
      if (!diffBuckets.has(bucket) || selected.length >= Math.min(count, 3)) {
        selected.push(ex);
        diffBuckets.add(bucket);
      }
    }
    // Fill remaining if diversity pass didn't get enough
    for (const ex of scored) {
      if (selected.length >= count) break;
      if (!selected.find((s) => s.id === ex.id)) {
        selected.push(ex);
      }
    }

    for (const ex of selected) {
      const id = uuid();
      await execute(
        "INSERT INTO excerpt_rotation_log (id, date, excerpt_id, user_id) VALUES ($1, $2, $3, $4)",
        [id, today, ex.id, req.user.id],
      );
    }

    rotation = await queryAll(
      "SELECT rl.*, e.title, e.composer, e.status, e.difficulty, e.full_work_title, e.location_in_score FROM excerpt_rotation_log rl JOIN excerpts e ON rl.excerpt_id = e.id WHERE rl.date = $1 AND rl.user_id = $2 ORDER BY rl.created_at",
      [today, req.user.id],
    );
  }

  res.json(rotation);
});

// POST mark excerpt as practiced in today's rotation
router.post("/rotation/:rotationId/practiced", async (req, res) => {
  const { rotationId } = req.params;
  const row = await queryOne(
    "SELECT * FROM excerpt_rotation_log WHERE id = $1",
    [rotationId],
  );
  if (!row) return res.status(404).json({ error: "Not found" });

  await execute(
    "UPDATE excerpt_rotation_log SET practiced = TRUE WHERE id = $1",
    [rotationId],
  );
  await execute(
    "UPDATE excerpts SET last_practiced = CURRENT_DATE::TEXT, times_practiced = times_practiced + 1, updated_at = NOW() WHERE id = $1",
    [row.excerpt_id],
  );

  res.json({ ok: true });
});

// POST generate a practice session
router.post("/generate", enforceSessionLimit, async (req, res) => {
  const { duration_min = 60, audition_mode } = req.body;

  const allocRow = await queryOne(
    "SELECT value FROM settings WHERE key = 'timeAllocation'",
  );
  let alloc = allocRow
    ? JSON.parse(allocRow.value)
    : {
        warmup: 10,
        fundamentals: 10,
        technique: 25,
        repertoire: 35,
        excerpts: 15,
        buffer: 5,
      };

  // Audition mode: shift allocation to 50%+ excerpts
  if (audition_mode) {
    alloc = {
      warmup: 10,
      fundamentals: 5,
      technique: 10,
      repertoire: 20,
      excerpts: 50,
      buffer: 5,
    };
  } else {
    // Auto-detect: check if any audition within 14 days
    const twoWeeks = new Date(Date.now() + 14 * 86400000)
      .toISOString()
      .slice(0, 10);
    const todayStr = new Date().toISOString().slice(0, 10);
    const upcoming = await queryOne(
      "SELECT COUNT(*) as count FROM auditions WHERE audition_date >= $1 AND audition_date <= $2 AND (result IS NULL OR result = 'pending') AND user_id = $3",
      [todayStr, twoWeeks, req.user.id],
    );
    const upcomingExcerpts = await queryOne(
      "SELECT COUNT(*) as count FROM excerpts WHERE audition_date IS NOT NULL AND audition_date >= $1 AND audition_date <= $2 AND user_id = $3",
      [todayStr, twoWeeks, req.user.id],
    );
    if (
      parseInt(upcoming?.count || "0") > 0 ||
      parseInt(upcomingExcerpts?.count || "0") > 0
    ) {
      // Nudge excerpts up to 35% (not full audition mode, just a boost)
      const excerptBoost = Math.min(20, 50 - alloc.excerpts);
      if (excerptBoost > 0) {
        const reduction = Math.round(excerptBoost / 2);
        alloc = {
          ...alloc,
          excerpts: alloc.excerpts + excerptBoost,
          repertoire: alloc.repertoire - reduction,
          technique: alloc.technique - (excerptBoost - reduction),
        };
      }
    }
  }

  const minutes = {};
  for (const [cat, pct] of Object.entries(alloc)) {
    minutes[cat] = Math.round((pct / 100) * duration_min);
  }

  const blocks = [];
  let order = 0;

  // 1. Warm-up
  if (minutes.warmup > 0) {
    blocks.push({
      id: uuid(),
      category: "warmup",
      title: "Warm-up",
      description: "Long tones, gentle scales, breathing exercises",
      planned_duration_min: minutes.warmup,
      sort_order: order++,
      status: "pending",
    });
  }

  // 2. Fundamentals
  if (minutes.fundamentals > 0) {
    const fundExercises = await queryAll(
      "SELECT e.*, tc.name as category_name FROM exercises e LEFT JOIN taxonomy_categories tc ON e.category_id = tc.id WHERE tc.name ILIKE ANY(ARRAY['%scale%','%tone%','%long tone%','%fundamental%']) AND e.user_id = $1 ORDER BY e.last_used ASC NULLS FIRST, e.times_used ASC LIMIT 3",
      [req.user.id],
    );
    if (fundExercises.length > 0) {
      const perEx = Math.round(minutes.fundamentals / fundExercises.length);
      for (const ex of fundExercises) {
        blocks.push({
          id: uuid(),
          category: "fundamentals",
          title: ex.title,
          description: `${ex.category_name || "Fundamentals"} — ${ex.source || "Exercise library"}`,
          planned_duration_min: perEx,
          sort_order: order++,
          status: "pending",
          linked_type: "exercise",
          linked_id: ex.id,
        });
      }
    } else {
      blocks.push({
        id: uuid(),
        category: "fundamentals",
        title: "Fundamentals",
        description: "Scales, long tones, and basic technical work",
        planned_duration_min: minutes.fundamentals,
        sort_order: order++,
        status: "pending",
      });
    }
  }

  // 3. Technique
  if (minutes.technique > 0) {
    const techExercises = await queryAll(`
      SELECT DISTINCT ON (e.id) e.*, td.description as demand_desc, p.title as piece_title, tc.name as category_name
      FROM exercises e
      JOIN demand_exercises de ON e.id = de.exercise_id
      JOIN technical_demands td ON de.demand_id = td.id
      JOIN pieces p ON td.piece_id = p.id
      LEFT JOIN taxonomy_categories tc ON e.category_id = tc.id
      WHERE p.status = 'in_progress' AND p.user_id = $1
      ORDER BY e.id, p.priority DESC, td.difficulty DESC
      LIMIT 4
    `, [req.user.id]);

    if (techExercises.length > 0) {
      const perEx = Math.round(minutes.technique / techExercises.length);
      for (const ex of techExercises) {
        blocks.push({
          id: uuid(),
          category: "technique",
          title: ex.title,
          description: `For: ${ex.piece_title} — ${ex.demand_desc}`,
          planned_duration_min: perEx,
          sort_order: order++,
          status: "pending",
          linked_type: "exercise",
          linked_id: ex.id,
          focus_points: ex.demand_desc,
        });
      }
    } else {
      blocks.push({
        id: uuid(),
        category: "technique",
        title: "Technique work",
        description:
          "Link exercises to piece demands to get targeted blocks here",
        planned_duration_min: minutes.technique,
        sort_order: order++,
        status: "pending",
      });
    }
  }

  // 4. Repertoire
  if (minutes.repertoire > 0) {
    const sections = await queryAll(`
      SELECT s.*, p.title as piece_title, p.priority, p.target_date,
        CASE s.status
          WHEN 'not_started' THEN 4
          WHEN 'working_on' THEN 3
          WHEN 'solid' THEN 2
          WHEN 'polished' THEN 1
        END as status_priority
      FROM sections s
      JOIN pieces p ON s.piece_id = p.id
      WHERE p.status = 'in_progress' AND p.user_id = $1
      ORDER BY
        CASE p.priority WHEN 'high' THEN 3 WHEN 'medium' THEN 2 WHEN 'low' THEN 1 END DESC,
        p.target_date ASC NULLS LAST,
        status_priority DESC,
        s.sort_order ASC
      LIMIT 4
    `, [req.user.id]);

    if (sections.length > 0) {
      const perSection = Math.round(minutes.repertoire / sections.length);
      for (const s of sections) {
        blocks.push({
          id: uuid(),
          category: "repertoire",
          title: `${s.piece_title} — ${s.name}`,
          description: s.bar_range ? `Bars ${s.bar_range}` : "Full section",
          planned_duration_min: perSection,
          sort_order: order++,
          status: "pending",
          linked_type: "section",
          linked_id: s.id,
          focus_points: s.notes || "",
        });
      }
    } else {
      blocks.push({
        id: uuid(),
        category: "repertoire",
        title: "Repertoire practice",
        description: "Add pieces with sections to get targeted blocks here",
        planned_duration_min: minutes.repertoire,
        sort_order: order++,
        status: "pending",
      });
    }
  }

  // 5. Excerpts
  if (minutes.excerpts > 0) {
    const today = new Date().toISOString().slice(0, 10);
    const rotation = await queryAll(
      "SELECT rl.*, e.title, e.composer, e.location_in_score, e.performance_notes FROM excerpt_rotation_log rl JOIN excerpts e ON rl.excerpt_id = e.id WHERE rl.date = $1 AND rl.user_id = $2",
      [today, req.user.id],
    );

    if (rotation.length > 0) {
      const perExcerpt = Math.round(minutes.excerpts / rotation.length);
      for (const r of rotation) {
        blocks.push({
          id: uuid(),
          category: "excerpts",
          title: r.title,
          description: `${r.composer}${r.location_in_score ? " — " + r.location_in_score : ""}`,
          planned_duration_min: perExcerpt,
          sort_order: order++,
          status: "pending",
          linked_type: "excerpt",
          linked_id: r.excerpt_id,
          focus_points: r.performance_notes || "",
        });
      }
    } else {
      blocks.push({
        id: uuid(),
        category: "excerpts",
        title: "Orchestral excerpts",
        description: "Add excerpts to enable daily rotation",
        planned_duration_min: minutes.excerpts,
        sort_order: order++,
        status: "pending",
      });
    }
  }

  // 6. Buffer
  if (minutes.buffer > 0) {
    blocks.push({
      id: uuid(),
      category: "buffer",
      title: "Buffer / Sight-reading",
      description:
        "Overflow time, sight-reading, or revisit anything from the session",
      planned_duration_min: minutes.buffer,
      sort_order: order++,
      status: "pending",
    });
  }

  // Save session
  const sessionId = uuid();
  const today = new Date().toISOString().slice(0, 10);
  await execute(
    "INSERT INTO practice_sessions (id, date, planned_duration_min, status, time_allocation) VALUES ($1, $2, $3, $4, $5)",
    [sessionId, today, duration_min, "planned", JSON.stringify(alloc)],
  );

  for (const block of blocks) {
    await execute(
      "INSERT INTO session_blocks (id, session_id, category, title, description, planned_duration_min, sort_order, status, linked_type, linked_id, focus_points) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
      [
        block.id,
        sessionId,
        block.category,
        block.title,
        block.description,
        block.planned_duration_min,
        block.sort_order,
        block.status,
        block.linked_type || null,
        block.linked_id || null,
        block.focus_points || "",
      ],
    );
  }

  const session = await queryOne(
    "SELECT * FROM practice_sessions WHERE id = $1",
    [sessionId],
  );
  session.blocks = await queryAll(
    "SELECT * FROM session_blocks WHERE session_id = $1 ORDER BY sort_order",
    [sessionId],
  );
  res.status(201).json(session);
});

// GET current/latest session
router.get("/current", async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const session = await queryOne(
    "SELECT * FROM practice_sessions WHERE date = $1 AND status IN ('planned','in_progress') ORDER BY created_at DESC LIMIT 1",
    [today],
  );
  if (!session) return res.json(null);
  session.blocks = await queryAll(
    "SELECT * FROM session_blocks WHERE session_id = $1 ORDER BY sort_order",
    [session.id],
  );
  res.json(session);
});

// GET latest completed session (for repeat feature)
router.get("/latest-completed", async (req, res) => {
  const session = await queryOne(
    "SELECT * FROM practice_sessions WHERE status = 'completed' ORDER BY date DESC, created_at DESC LIMIT 1",
  );
  if (!session) return res.json(null);
  session.blocks = await queryAll(
    "SELECT * FROM session_blocks WHERE session_id = $1 ORDER BY sort_order",
    [session.id],
  );
  res.json(session);
});

// POST duplicate a session's block structure into a new session
router.post("/:id/duplicate", async (req, res) => {
  const source = await queryOne(
    "SELECT * FROM practice_sessions WHERE id = $1",
    [req.params.id],
  );
  if (!source) return res.status(404).json({ error: "Not found" });

  const sourceBlocks = await queryAll(
    "SELECT * FROM session_blocks WHERE session_id = $1 ORDER BY sort_order",
    [source.id],
  );
  if (sourceBlocks.length === 0)
    return res.status(400).json({ error: "Source session has no blocks" });

  const sessionId = uuid();
  const today = new Date().toISOString().slice(0, 10);

  await execute(
    "INSERT INTO practice_sessions (id, date, planned_duration_min, status, time_allocation) VALUES ($1, $2, $3, $4, $5)",
    [
      sessionId,
      today,
      source.planned_duration_min,
      "planned",
      source.time_allocation || "{}",
    ],
  );

  for (const block of sourceBlocks) {
    await execute(
      "INSERT INTO session_blocks (id, session_id, category, title, description, planned_duration_min, sort_order, status, linked_type, linked_id, focus_points) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
      [
        uuid(),
        sessionId,
        block.category,
        block.title,
        block.description,
        block.planned_duration_min,
        block.sort_order,
        "pending",
        block.linked_type || null,
        block.linked_id || null,
        block.focus_points || "",
      ],
    );
  }

  const session = await queryOne(
    "SELECT * FROM practice_sessions WHERE id = $1",
    [sessionId],
  );
  session.blocks = await queryAll(
    "SELECT * FROM session_blocks WHERE session_id = $1 ORDER BY sort_order",
    [sessionId],
  );
  res.status(201).json(session);
});

// ─── Session Templates ───

// POST save a session template
router.post("/templates", async (req, res) => {
  const { name, planned_duration_min, blocks } = req.body;
  if (!name || !blocks || !Array.isArray(blocks)) {
    return res.status(400).json({ error: "name and blocks[] are required" });
  }
  const id = uuid();
  const userId = req.user?.id || null;
  await execute(
    "INSERT INTO session_templates (id, user_id, name, planned_duration_min, blocks) VALUES ($1, $2, $3, $4, $5)",
    [
      id,
      userId,
      name.trim(),
      planned_duration_min || 60,
      JSON.stringify(blocks),
    ],
  );
  const template = await queryOne(
    "SELECT * FROM session_templates WHERE id = $1",
    [id],
  );
  template.blocks =
    typeof template.blocks === "string"
      ? JSON.parse(template.blocks)
      : template.blocks;
  res.status(201).json(template);
});

// GET list user's templates
router.get("/templates", async (req, res) => {
  const userId = req.user?.id || null;
  let templates;
  if (userId) {
    templates = await queryAll(
      "SELECT * FROM session_templates WHERE user_id = $1 ORDER BY created_at DESC",
      [userId],
    );
  } else {
    templates = await queryAll(
      "SELECT * FROM session_templates ORDER BY created_at DESC",
    );
  }
  for (const t of templates) {
    t.blocks = typeof t.blocks === "string" ? JSON.parse(t.blocks) : t.blocks;
  }
  res.json(templates);
});

// DELETE a template
router.delete("/templates/:id", async (req, res) => {
  const row = await queryOne("SELECT * FROM session_templates WHERE id = $1", [
    req.params.id,
  ]);
  if (!row) return res.status(404).json({ error: "Not found" });
  await execute("DELETE FROM session_templates WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
});

// POST create a session from a template
router.post("/templates/:id/use", async (req, res) => {
  const template = await queryOne(
    "SELECT * FROM session_templates WHERE id = $1",
    [req.params.id],
  );
  if (!template) return res.status(404).json({ error: "Template not found" });

  const blocks =
    typeof template.blocks === "string"
      ? JSON.parse(template.blocks)
      : template.blocks;
  if (!blocks || blocks.length === 0)
    return res.status(400).json({ error: "Template has no blocks" });

  const sessionId = uuid();
  const today = new Date().toISOString().slice(0, 10);

  await execute(
    "INSERT INTO practice_sessions (id, date, planned_duration_min, status, time_allocation) VALUES ($1, $2, $3, $4, $5)",
    [sessionId, today, template.planned_duration_min, "planned", "{}"],
  );

  for (const block of blocks) {
    await execute(
      "INSERT INTO session_blocks (id, session_id, category, title, description, planned_duration_min, sort_order, status, linked_type, linked_id, focus_points) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
      [
        uuid(),
        sessionId,
        block.category,
        block.title,
        block.description || "",
        block.planned_duration_min,
        block.sort_order,
        "pending",
        block.linked_type || null,
        block.linked_id || null,
        block.focus_points || "",
      ],
    );
  }

  const session = await queryOne(
    "SELECT * FROM practice_sessions WHERE id = $1",
    [sessionId],
  );
  session.blocks = await queryAll(
    "SELECT * FROM session_blocks WHERE session_id = $1 ORDER BY sort_order",
    [sessionId],
  );
  res.status(201).json(session);
});

// GET all sessions (history) — bulk fetch blocks (fixes N+1)
router.get("/", async (req, res) => {
  const sessions = await queryAll(
    "SELECT * FROM practice_sessions ORDER BY date DESC, created_at DESC LIMIT 50",
  );
  if (sessions.length > 0) {
    const sessionIds = sessions.map((s) => s.id);
    const allBlocks = await queryAll(
      "SELECT * FROM session_blocks WHERE session_id = ANY($1) ORDER BY sort_order",
      [sessionIds],
    );
    const blocksBySession = {};
    for (const b of allBlocks) {
      (blocksBySession[b.session_id] ||= []).push(b);
    }
    for (const s of sessions) {
      s.blocks = blocksBySession[s.id] || [];
    }
  }
  res.json(sessions);
});

// PUT start session
router.put("/:id/start", async (req, res) => {
  const session = await queryOne(
    "SELECT * FROM practice_sessions WHERE id = $1",
    [req.params.id],
  );
  if (!session) return res.status(404).json({ error: "Not found" });
  await execute(
    "UPDATE practice_sessions SET status = 'in_progress', started_at = NOW(), updated_at = NOW() WHERE id = $1",
    [req.params.id],
  );
  const firstBlock = await queryOne(
    "SELECT id FROM session_blocks WHERE session_id = $1 AND status = 'pending' ORDER BY sort_order LIMIT 1",
    [req.params.id],
  );
  if (firstBlock) {
    await execute("UPDATE session_blocks SET status = 'active' WHERE id = $1", [
      firstBlock.id,
    ]);
  }
  const updated = await queryOne(
    "SELECT * FROM practice_sessions WHERE id = $1",
    [req.params.id],
  );
  updated.blocks = await queryAll(
    "SELECT * FROM session_blocks WHERE session_id = $1 ORDER BY sort_order",
    [req.params.id],
  );
  res.json(updated);
});

// PUT complete a block
router.put("/:sessionId/blocks/:blockId/complete", async (req, res) => {
  const { sessionId, blockId } = req.params;
  const { actual_duration_min, notes } = req.body;
  await execute(
    "UPDATE session_blocks SET status = 'completed', actual_duration_min = $1, notes = $2, completed_at = NOW() WHERE id = $3 AND session_id = $4",
    [actual_duration_min || null, notes || "", blockId, sessionId],
  );

  const nextBlock = await queryOne(
    "SELECT id FROM session_blocks WHERE session_id = $1 AND status = 'pending' ORDER BY sort_order LIMIT 1",
    [sessionId],
  );
  if (nextBlock) {
    await execute("UPDATE session_blocks SET status = 'active' WHERE id = $1", [
      nextBlock.id,
    ]);
  }

  const session = await queryOne(
    "SELECT * FROM practice_sessions WHERE id = $1",
    [sessionId],
  );
  session.blocks = await queryAll(
    "SELECT * FROM session_blocks WHERE session_id = $1 ORDER BY sort_order",
    [sessionId],
  );
  res.json(session);
});

// PUT skip a block
router.put("/:sessionId/blocks/:blockId/skip", async (req, res) => {
  const { sessionId, blockId } = req.params;
  await execute(
    "UPDATE session_blocks SET status = 'skipped' WHERE id = $1 AND session_id = $2",
    [blockId, sessionId],
  );

  const nextBlock = await queryOne(
    "SELECT id FROM session_blocks WHERE session_id = $1 AND status = 'pending' ORDER BY sort_order LIMIT 1",
    [sessionId],
  );
  if (nextBlock) {
    await execute("UPDATE session_blocks SET status = 'active' WHERE id = $1", [
      nextBlock.id,
    ]);
  }

  const session = await queryOne(
    "SELECT * FROM practice_sessions WHERE id = $1",
    [sessionId],
  );
  session.blocks = await queryAll(
    "SELECT * FROM session_blocks WHERE session_id = $1 ORDER BY sort_order",
    [sessionId],
  );
  res.json(session);
});

// PUT complete session
router.put("/:id/complete", async (req, res) => {
  const { rating, notes } = req.body;
  const session = await queryOne(
    "SELECT * FROM practice_sessions WHERE id = $1",
    [req.params.id],
  );
  if (!session) return res.status(404).json({ error: "Not found" });

  const blocks = await queryAll(
    "SELECT * FROM session_blocks WHERE session_id = $1",
    [req.params.id],
  );
  const actualMin = blocks.reduce(
    (sum, b) => sum + (b.actual_duration_min || b.planned_duration_min),
    0,
  );

  await execute(
    "UPDATE practice_sessions SET status = 'completed', actual_duration_min = $1, rating = $2, notes = $3, updated_at = NOW() WHERE id = $4",
    [actualMin, rating || null, notes || "", req.params.id],
  );

  const updated = await queryOne(
    "SELECT * FROM practice_sessions WHERE id = $1",
    [req.params.id],
  );
  updated.blocks = await queryAll(
    "SELECT * FROM session_blocks WHERE session_id = $1 ORDER BY sort_order",
    [req.params.id],
  );
  res.json(updated);
});

// GET analytics: time by category
router.get("/analytics/time-by-category", async (req, res) => {
  const period = req.query.period || "month";
  const weeksBack = period === "week" ? 4 : period === "quarter" ? 13 : 8;
  const startDate = new Date(Date.now() - weeksBack * 7 * 86400000)
    .toISOString()
    .slice(0, 10);

  const rows = await queryAll(
    `
    SELECT
      DATE_TRUNC('week', ps.date::date)::date AS week,
      sb.category,
      COALESCE(SUM(sb.actual_duration_min), SUM(sb.planned_duration_min)) AS minutes
    FROM practice_sessions ps
    JOIN session_blocks sb ON sb.session_id = ps.id
    WHERE ps.status = 'completed' AND ps.date >= $1 AND sb.status = 'completed'
    GROUP BY week, sb.category
    ORDER BY week
  `,
    [startDate],
  );

  const weekMap = {};
  for (const r of rows) {
    const w =
      r.week instanceof Date
        ? r.week.toISOString().slice(0, 10)
        : String(r.week).slice(0, 10);
    if (!weekMap[w]) weekMap[w] = { week: w };
    weekMap[w][r.category] = Number(r.minutes);
  }

  res.json({ weeks: Object.values(weekMap) });
});

// GET analytics: trends
router.get("/analytics/trends", async (req, res) => {
  const period = req.query.period || "week";
  const days = period === "month" ? 30 : 7;
  const now = new Date();
  const currentStart = new Date(now - days * 86400000)
    .toISOString()
    .slice(0, 10);
  const prevStart = new Date(now - days * 2 * 86400000)
    .toISOString()
    .slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  const current = await queryAll(
    "SELECT * FROM practice_sessions WHERE status = 'completed' AND date >= $1 AND date <= $2",
    [currentStart, today],
  );
  const previous = await queryAll(
    "SELECT * FROM practice_sessions WHERE status = 'completed' AND date >= $1 AND date < $2",
    [prevStart, currentStart],
  );

  const allPeriod = await queryAll(
    "SELECT * FROM practice_sessions WHERE date >= $1 AND date <= $2",
    [currentStart, today],
  );

  const curMinutes = current.reduce(
    (s, r) => s + (r.actual_duration_min || r.planned_duration_min || 0),
    0,
  );
  const prevMinutes = previous.reduce(
    (s, r) => s + (r.actual_duration_min || r.planned_duration_min || 0),
    0,
  );
  const curCount = current.length;
  const prevCount = previous.length;
  const curAvg = curCount > 0 ? Math.round(curMinutes / curCount) : 0;
  const prevAvg = prevCount > 0 ? Math.round(prevMinutes / prevCount) : 0;
  const completionRate =
    allPeriod.length > 0
      ? Math.round((current.length / allPeriod.length) * 100)
      : 0;

  const ratings = { good: 0, okay: 0, bad: 0 };
  for (const s of current) {
    if (s.rating && ratings[s.rating] !== undefined) ratings[s.rating]++;
  }

  res.json({
    current: {
      totalMinutes: curMinutes,
      totalHours: +(curMinutes / 60).toFixed(1),
      sessionCount: curCount,
      avgLength: curAvg,
      completionRate,
    },
    previous: {
      totalMinutes: prevMinutes,
      totalHours: +(prevMinutes / 60).toFixed(1),
      sessionCount: prevCount,
      avgLength: prevAvg,
    },
    ratings,
  });
});

// GET analytics: stalled pieces
router.get("/analytics/stalled-pieces", async (req, res) => {
  const rows = await queryAll(`
    SELECT p.id as piece_id, p.title, p.composer,
      COALESCE(SUM(sb.actual_duration_min), 0) AS total_minutes,
      MAX(s.updated_at) AS last_status_change
    FROM pieces p
    JOIN sections s ON s.piece_id = p.id
    JOIN session_blocks sb ON sb.linked_type = 'section' AND sb.linked_id = s.id AND sb.status = 'completed'
    WHERE p.status = 'in_progress'
    GROUP BY p.id, p.title, p.composer
    HAVING COALESCE(SUM(sb.actual_duration_min), 0) > 120
      AND MAX(s.updated_at) < NOW() - INTERVAL '14 days'
    ORDER BY total_minutes DESC
  `);

  res.json(
    rows.map((r) => ({
      piece_id: r.piece_id,
      title: r.title,
      composer: r.composer,
      total_minutes: Number(r.total_minutes),
      last_status_change: r.last_status_change,
      days_since_change: Math.floor(
        (Date.now() - new Date(r.last_status_change).getTime()) / 86400000,
      ),
    })),
  );
});

// GET analytics: drift
router.get("/analytics/drift", async (req, res) => {
  const allocRow = await queryOne(
    "SELECT value FROM settings WHERE key = 'timeAllocation'",
  );
  const target = allocRow
    ? JSON.parse(allocRow.value)
    : {
        warmup: 10,
        fundamentals: 10,
        technique: 25,
        repertoire: 35,
        excerpts: 15,
        buffer: 5,
      };

  const twoWeeksAgo = new Date(Date.now() - 14 * 86400000)
    .toISOString()
    .slice(0, 10);
  const rows = await queryAll(
    `
    SELECT sb.category, COALESCE(SUM(sb.actual_duration_min), SUM(sb.planned_duration_min)) AS minutes
    FROM practice_sessions ps
    JOIN session_blocks sb ON sb.session_id = ps.id
    WHERE ps.status = 'completed' AND ps.date >= $1 AND sb.status = 'completed'
    GROUP BY sb.category
  `,
    [twoWeeksAgo],
  );

  const totalActual = rows.reduce((s, r) => s + Number(r.minutes), 0);
  const actual = {};
  const drift = {};
  const alerts = [];

  for (const r of rows) {
    actual[r.category] =
      totalActual > 0 ? Math.round((Number(r.minutes) / totalActual) * 100) : 0;
  }

  const categories = [
    "warmup",
    "fundamentals",
    "technique",
    "repertoire",
    "excerpts",
    "buffer",
  ];
  for (const cat of categories) {
    const t = target[cat] || 0;
    const a = actual[cat] || 0;
    drift[cat] = a - t;
    if (Math.abs(a - t) > 10) {
      const label = cat.charAt(0).toUpperCase() + cat.slice(1);
      alerts.push(
        `${label} is ${Math.abs(a - t)}% ${a > t ? "above" : "below"} target`,
      );
    }
  }

  res.json({ target, actual, drift, alerts, hasData: totalActual > 0 });
});

// GET analytics: session history (paginated)
router.get("/analytics/history", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = (page - 1) * limit;

  let whereClause = "WHERE status = 'completed'";
  const params = [];
  let paramIdx = 1;

  if (req.query.from) {
    whereClause += ` AND date >= $${paramIdx++}`;
    params.push(req.query.from);
  }
  if (req.query.to) {
    whereClause += ` AND date <= $${paramIdx++}`;
    params.push(req.query.to);
  }

  const countRow = await queryOne(
    `SELECT COUNT(*) as total FROM practice_sessions ${whereClause}`,
    params,
  );
  const total = parseInt(countRow.total);

  const sessions = await queryAll(
    `SELECT * FROM practice_sessions ${whereClause} ORDER BY date DESC, created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
    [...params, limit, offset],
  );

  for (const s of sessions) {
    const blocks = await queryAll(
      "SELECT * FROM session_blocks WHERE session_id = $1 ORDER BY sort_order",
      [s.id],
    );
    s.blocks_total = blocks.length;
    s.blocks_completed = blocks.filter((b) => b.status === "completed").length;
  }

  res.json({ sessions, total, page, totalPages: Math.ceil(total / limit) });
});

// POST quick-log — manually log practice without using session planner
router.post("/quick-log", async (req, res) => {
  const { notes, duration_min, date, rating } = req.body;
  if (!notes || !duration_min) {
    return res
      .status(400)
      .json({ error: "notes and duration_min are required" });
  }

  const sessionId = uuid();
  const logDate = date || new Date().toISOString().slice(0, 10);

  await execute(
    "INSERT INTO practice_sessions (id, date, planned_duration_min, actual_duration_min, status, rating, updated_at) VALUES ($1, $2, $3, $4, 'completed', $5, NOW())",
    [sessionId, logDate, duration_min, duration_min, rating || null],
  );

  const blockId = uuid();
  await execute(
    "INSERT INTO session_blocks (id, session_id, category, title, description, planned_duration_min, actual_duration_min, sort_order, status, notes) VALUES ($1, $2, 'buffer', 'Quick Log', $3, $4, $5, 0, 'completed', $6)",
    [blockId, sessionId, notes, duration_min, duration_min, notes],
  );

  const session = await queryOne(
    "SELECT * FROM practice_sessions WHERE id = $1",
    [sessionId],
  );
  session.blocks = await queryAll(
    "SELECT * FROM session_blocks WHERE session_id = $1 ORDER BY sort_order",
    [sessionId],
  );
  res.status(201).json(session);
});

// GET stats (for dashboard)
router.get("/stats", async (req, res) => {
  const weekAgo = new Date(Date.now() - 7 * 86400000)
    .toISOString()
    .slice(0, 10);
  const weekSessions = await queryAll(
    "SELECT * FROM practice_sessions WHERE date >= $1 AND status = 'completed'",
    [weekAgo],
  );

  const totalMinutes = weekSessions.reduce(
    (sum, s) => sum + (s.actual_duration_min || s.planned_duration_min || 0),
    0,
  );
  const sessionCount = weekSessions.length;

  // Streak with 1-day grace period (allows rest days without breaking streak)
  let streak = 0;
  const graceDays = 1;
  const practiceDates = await queryAll(
    "SELECT DISTINCT date FROM practice_sessions WHERE status = 'completed' ORDER BY date DESC",
  );
  if (practiceDates.length > 0) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const dates = practiceDates.map((d) => d.date);
    // Most recent practice must be within grace_days+1 of today
    const mostRecent = new Date(dates[0]);
    const today = new Date(todayStr);
    const daysSinceLast = Math.round((today - mostRecent) / 86400000);
    if (daysSinceLast <= graceDays + 1) {
      streak = 1; // count the most recent day
      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1]);
        const curr = new Date(dates[i]);
        const gap = Math.round((prev - curr) / 86400000);
        if (gap <= graceDays + 1) {
          streak++;
        } else {
          break;
        }
      }
    }
  }

  res.json({
    weekMinutes: totalMinutes,
    weekHours: +(totalMinutes / 60).toFixed(1),
    weekSessions: sessionCount,
    streak,
  });
});

// GET analytics: calendar data (for heatmap)
router.get("/analytics/calendar", async (req, res) => {
  // Default: last 12 months
  const months = parseInt(req.query.months) || 12;
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  const startStr = startDate.toISOString().slice(0, 10);

  const rows = await queryAll(
    `
    SELECT
      date,
      COUNT(*) as session_count,
      COALESCE(SUM(actual_duration_min), SUM(planned_duration_min)) as total_minutes,
      MAX(rating) as best_rating
    FROM practice_sessions
    WHERE status = 'completed' AND date >= $1
    GROUP BY date
    ORDER BY date
  `,
    [startStr],
  );

  res.json(
    rows.map((r) => ({
      date: r.date,
      sessions: parseInt(r.session_count),
      minutes: parseInt(r.total_minutes) || 0,
      rating: r.best_rating,
    })),
  );
});

// GET analytics: streaks (extended)
router.get("/analytics/streaks", async (req, res) => {
  const practiceDates = await queryAll(
    "SELECT DISTINCT date FROM practice_sessions WHERE status = 'completed' ORDER BY date DESC",
  );

  const totalDays = practiceDates.length;
  let currentStreak = 0;
  let longestStreak = 0;

  if (practiceDates.length > 0) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterdayStr = new Date(Date.now() - 86400000)
      .toISOString()
      .slice(0, 10);
    const dateSet = new Set(practiceDates.map((d) => d.date));

    // Current streak
    let checkDate = todayStr;
    if (!dateSet.has(todayStr)) {
      checkDate = dateSet.has(yesterdayStr) ? yesterdayStr : null;
    }
    if (checkDate) {
      let d = new Date(checkDate);
      while (dateSet.has(d.toISOString().slice(0, 10))) {
        currentStreak++;
        d = new Date(d.getTime() - 86400000);
      }
    }

    // Longest streak — walk all dates
    const sortedDates = practiceDates.map((d) => d.date).sort();
    let running = 1;
    longestStreak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1]);
      const curr = new Date(sortedDates[i]);
      const diffDays = Math.round((curr - prev) / 86400000);
      if (diffDays === 1) {
        running++;
        longestStreak = Math.max(longestStreak, running);
      } else {
        running = 1;
      }
    }
    if (totalDays === 0) longestStreak = 0;
  }

  // Total hours all time
  const totalRow = await queryOne(
    "SELECT COALESCE(SUM(actual_duration_min), SUM(planned_duration_min), 0) as total FROM practice_sessions WHERE status = 'completed'",
  );
  const totalMinutes = parseInt(totalRow?.total || "0");

  res.json({
    current_streak: currentStreak,
    longest_streak: longestStreak,
    total_practice_days: totalDays,
    total_hours: +(totalMinutes / 60).toFixed(1),
  });
});

export default router;
