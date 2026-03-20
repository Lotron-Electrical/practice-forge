/**
 * AI-assisted exercise generator (Layer 2)
 * Uses Claude API for creative/contextual exercise generation:
 * - Excerpt preparation routines
 * - Custom technical studies
 * - Session warm-ups
 * - Exercises too complex for rule-based generation
 */

import Anthropic from "@anthropic-ai/sdk";
import { execute } from "../db/helpers.js";
import { v4 as uuid } from "uuid";
import { getRange } from "./ruleGenerator.js";

let client = null;

function getClient() {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
    client = new Anthropic({ apiKey });
  }
  return client;
}

function semitoneToNoteName(midi) {
  const names = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ];
  const octave = Math.floor(midi / 12) - 1;
  return names[midi % 12] + octave;
}

function buildSystemPrompt(instrument) {
  const range = getRange(instrument);
  const instName = instrument || "flute";
  const lowNote = semitoneToNoteName(range.low);
  const highNote = semitoneToNoteName(range.high);
  return `You are a music composition assistant specialising in ${instName} exercises and practice routines. You generate exercises in ABC notation format.

Rules:
- ${instName} range: ${lowNote} to ${highNote}
- Use standard ABC notation (X:, T:, M:, L:, Q:, K: headers)
- Keep exercises focused and practical (16-64 bars typically)
- Include tempo markings appropriate to the technique
- Output ONLY the ABC notation block, no explanations before or after
- Use appropriate key signatures
- For preparation routines, structure as multiple sections (slow scales, intervals, simplified passage, building tempo)`;
}

/**
 * Generate a custom exercise via Claude
 * @param {object} params
 * @param {string} params.type - 'excerpt_prep' | 'custom_study' | 'warmup' | 'variation'
 * @param {string} params.prompt - Specific request
 * @param {object} [params.context] - Additional context (demands, key, difficulty, etc.)
 * @returns {Promise<{title: string, abc: string, description: string, key: string, difficulty: number, tags: string[], cost: number}>}
 */
export async function generateWithAI(params) {
  const { type, prompt, context = {}, instrument } = params;

  let userPrompt;
  switch (type) {
    case "excerpt_prep":
      userPrompt = buildExcerptPrepPrompt(prompt, context);
      break;
    case "warmup":
      userPrompt = buildWarmupPrompt(prompt, context);
      break;
    case "variation":
      userPrompt = buildVariationPrompt(prompt, context);
      break;
    case "custom_study":
    default:
      userPrompt = buildCustomStudyPrompt(prompt, context, instrument);
      break;
  }

  const anthropic = getClient();
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: buildSystemPrompt(instrument),
    messages: [{ role: "user", content: userPrompt }],
  });

  const text =
    response.content[0]?.type === "text" ? response.content[0].text : "";

  // Extract ABC notation from response
  const abc = extractAbc(text);

  // Extract metadata from the ABC
  const title = extractAbcField(abc, "T") || `Generated ${type} exercise`;
  const key = extractAbcField(abc, "K") || context.key || "C";

  // Calculate cost
  const inputTokens = response.usage?.input_tokens || 0;
  const outputTokens = response.usage?.output_tokens || 0;
  const cost = (inputTokens * 0.003 + outputTokens * 0.015) / 1000; // Sonnet pricing

  // Track AI usage if user_id provided
  if (params.user_id) {
    try {
      await execute(
        `INSERT INTO ai_usage (id, user_id, generation_type, model, input_tokens, output_tokens, cost_usd)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          uuid(),
          params.user_id,
          type,
          "claude-sonnet-4-20250514",
          inputTokens,
          outputTokens,
          cost,
        ],
      );
    } catch (err) {
      console.error("Failed to track AI usage:", err.message);
    }
  }

  return {
    title,
    abc,
    description: buildDescription(type, prompt, context),
    key,
    difficulty: context.difficulty || 5,
    tags: buildTags(type, context),
    cost,
    generation_method: "claude_api",
    prompt_used: userPrompt,
  };
}

function buildExcerptPrepPrompt(prompt, context) {
  const parts = [`Generate a preparation routine for this orchestral excerpt:`];
  if (prompt) parts.push(prompt);
  if (context.title) parts.push(`Excerpt: ${context.title}`);
  if (context.composer) parts.push(`Composer: ${context.composer}`);
  if (context.key) parts.push(`Key: ${context.key}`);
  if (context.difficulty) parts.push(`Difficulty: ${context.difficulty}/10`);
  if (context.demands) parts.push(`Technical demands: ${context.demands}`);
  parts.push("\nGenerate a structured warm-up/preparation routine with:");
  parts.push("1. Relevant scales and arpeggios in the excerpt's key");
  parts.push(
    "2. Interval exercises targeting the specific intervals in the passage",
  );
  parts.push("3. A simplified version of the passage");
  parts.push("4. Gradually building to performance tempo");
  parts.push("\nOutput as a single ABC notation block with section markers.");
  return parts.join("\n");
}

function buildWarmupPrompt(prompt, context) {
  const parts = [
    `Generate a personalised warm-up routine for a practice session.`,
  ];
  if (prompt) parts.push(prompt);
  if (context.keys)
    parts.push(`Session will cover these keys: ${context.keys.join(", ")}`);
  if (context.registers) parts.push(`Register focus: ${context.registers}`);
  if (context.duration_min)
    parts.push(`Target warm-up duration: ${context.duration_min} minutes`);
  parts.push("\nInclude:");
  parts.push("1. Long tones in relevant registers");
  parts.push("2. Scales in the session's keys");
  parts.push("3. Flexibility/interval exercises");
  parts.push("4. Brief technical pattern that previews the session's demands");
  parts.push("\nOutput as ABC notation.");
  return parts.join("\n");
}

function buildVariationPrompt(prompt, context) {
  const parts = [`Generate a variation of this exercise:`];
  if (context.original_abc) parts.push(`Original:\n${context.original_abc}`);
  if (prompt) parts.push(`Variation request: ${prompt}`);
  parts.push(
    "\nMaintain the same key and general character but vary the pattern.",
  );
  parts.push("Output as ABC notation.");
  return parts.join("\n");
}

function buildCustomStudyPrompt(prompt, context, instrument) {
  const parts = [`Generate a custom technical study for ${instrument || 'flute'}.`];
  if (prompt) parts.push(`Request: ${prompt}`);
  if (context.key) parts.push(`Key: ${context.key}`);
  if (context.difficulty) parts.push(`Difficulty: ${context.difficulty}/10`);
  if (context.category) parts.push(`Technique category: ${context.category}`);
  if (context.demands) parts.push(`Target demands: ${context.demands}`);
  parts.push("\nOutput as ABC notation. Make it practical and focused.");
  return parts.join("\n");
}

function extractAbc(text) {
  // Try to find ABC block between code fences
  const fenced = text.match(/```(?:abc)?\s*\n([\s\S]*?)\n```/);
  if (fenced) return fenced[1].trim();

  // Try to find X: header and everything after
  const xMatch = text.match(/(X:\d+[\s\S]*?\|])/);
  if (xMatch) return xMatch[1].trim();

  // Fallback: if text starts with X:
  if (text.trim().startsWith("X:")) return text.trim();

  return text.trim();
}

function extractAbcField(abc, field) {
  const match = abc.match(new RegExp(`^${field}:(.+)$`, "m"));
  return match ? match[1].trim() : null;
}

function buildDescription(type, prompt, context) {
  const parts = [];
  switch (type) {
    case "excerpt_prep":
      parts.push(`Preparation routine for ${context.title || "excerpt"}`);
      break;
    case "warmup":
      parts.push("AI-generated warm-up routine");
      break;
    case "variation":
      parts.push("AI-generated variation");
      break;
    default:
      parts.push("AI-generated technical study");
  }
  if (prompt) parts.push(`— ${prompt}`);
  return parts.join(" ");
}

function buildTags(type, context) {
  const tags = ["generated", "ai"];
  tags.push(type.replace("_", "-"));
  if (context.key) tags.push(context.key.toLowerCase());
  return tags;
}

/**
 * Estimate the cost of an AI generation call
 */
export function estimateCost() {
  // Typical: ~500 input tokens, ~800 output tokens
  return {
    estimated_cost: "$0.01–0.03",
    model: "claude-sonnet-4-20250514",
  };
}
