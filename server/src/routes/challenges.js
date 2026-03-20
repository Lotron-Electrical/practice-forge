import { Router } from "express";
import { queryAll, queryOne, execute } from "../db/helpers.js";
import { v4 as uuid } from "uuid";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

// POST — create a challenge
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const {
      type,
      content_type,
      content_id,
      description,
      notation_data,
      deadline,
      invited_user_ids = [],
    } = req.body;
    if (!type) return res.status(400).json({ error: "type is required" });

    const id = uuid();
    const status = invited_user_ids.length === 0 ? "active" : "pending";

    await execute(
      `INSERT INTO challenges (id, creator_id, type, content_type, content_id, description, notation_data, deadline, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        req.user.id,
        type,
        content_type || null,
        content_id || null,
        description || null,
        notation_data ? JSON.stringify(notation_data) : null,
        deadline || null,
        status,
      ],
    );

    // Add creator as accepted participant
    const creatorPartId = uuid();
    await execute(
      `INSERT INTO challenge_participants (id, challenge_id, user_id, status)
     VALUES ($1, $2, $3, 'accepted')`,
      [creatorPartId, id, req.user.id],
    );

    // Add invited users
    for (const userId of invited_user_ids) {
      const partId = uuid();
      await execute(
        `INSERT INTO challenge_participants (id, challenge_id, user_id, status)
       VALUES ($1, $2, $3, 'invited')`,
        [partId, id, userId],
      );
    }

    const challenge = await queryOne("SELECT * FROM challenges WHERE id = $1", [
      id,
    ]);
    challenge.participants = await queryAll(
      `SELECT cp.*, u.display_name, u.instrument
     FROM challenge_participants cp
     JOIN users u ON cp.user_id = u.id
     WHERE cp.challenge_id = $1`,
      [id],
    );
    res.status(201).json(challenge);
  }),
);

// GET — list challenges for current user
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status } = req.query;
    let sql = `SELECT DISTINCT c.* FROM challenges c
     LEFT JOIN challenge_participants cp ON cp.challenge_id = c.id
     WHERE (c.creator_id = $1 OR cp.user_id = $1)`;
    const params = [req.user.id];
    let idx = 2;

    if (status) {
      sql += ` AND c.status = $${idx++}`;
      params.push(status);
    }

    sql += " ORDER BY c.created_at DESC LIMIT 50";
    const challenges = await queryAll(sql, params);

    // Attach participants to each challenge
    for (const ch of challenges) {
      ch.participants = await queryAll(
        `SELECT cp.*, u.display_name, u.instrument
       FROM challenge_participants cp
       JOIN users u ON cp.user_id = u.id
       WHERE cp.challenge_id = $1`,
        [ch.id],
      );
    }

    res.json(challenges);
  }),
);

// GET — single challenge with participants
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const challenge = await queryOne("SELECT * FROM challenges WHERE id = $1", [
      req.params.id,
    ]);
    if (!challenge)
      return res.status(404).json({ error: "Challenge not found" });

    challenge.participants = await queryAll(
      `SELECT cp.*, u.display_name, u.instrument
     FROM challenge_participants cp
     JOIN users u ON cp.user_id = u.id
     WHERE cp.challenge_id = $1`,
      [req.params.id],
    );
    res.json(challenge);
  }),
);

// PUT — cancel a challenge (creator only)
router.put(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    const challenge = await queryOne("SELECT * FROM challenges WHERE id = $1", [
      req.params.id,
    ]);
    if (!challenge)
      return res.status(404).json({ error: "Challenge not found" });
    if (challenge.creator_id !== req.user.id)
      return res.status(403).json({ error: "Only the creator can cancel" });

    await execute("UPDATE challenges SET status = 'cancelled' WHERE id = $1", [
      req.params.id,
    ]);
    res.json(
      await queryOne("SELECT * FROM challenges WHERE id = $1", [req.params.id]),
    );
  }),
);

// PUT — accept challenge invitation
router.put(
  "/:id/accept",
  asyncHandler(async (req, res) => {
    const participant = await queryOne(
      "SELECT * FROM challenge_participants WHERE challenge_id = $1 AND user_id = $2 AND status = 'invited'",
      [req.params.id, req.user.id],
    );
    if (!participant)
      return res.status(404).json({ error: "No pending invitation found" });

    await execute(
      "UPDATE challenge_participants SET status = 'accepted' WHERE id = $1",
      [participant.id],
    );

    // If all participants accepted, set challenge to active
    const pending = await queryOne(
      "SELECT id FROM challenge_participants WHERE challenge_id = $1 AND status = 'invited'",
      [req.params.id],
    );
    if (!pending) {
      await execute("UPDATE challenges SET status = 'active' WHERE id = $1", [
        req.params.id,
      ]);
    }

    res.json(
      await queryOne("SELECT * FROM challenges WHERE id = $1", [req.params.id]),
    );
  }),
);

// PUT — decline challenge invitation
router.put(
  "/:id/decline",
  asyncHandler(async (req, res) => {
    const participant = await queryOne(
      "SELECT * FROM challenge_participants WHERE challenge_id = $1 AND user_id = $2 AND status = 'invited'",
      [req.params.id, req.user.id],
    );
    if (!participant)
      return res.status(404).json({ error: "No pending invitation found" });

    await execute(
      "UPDATE challenge_participants SET status = 'declined' WHERE id = $1",
      [participant.id],
    );
    res.json(
      await queryOne("SELECT * FROM challenges WHERE id = $1", [req.params.id]),
    );
  }),
);

// PUT — submit recording for a challenge
router.put(
  "/:id/submit",
  asyncHandler(async (req, res) => {
    const { recording_id, score } = req.body;

    const participant = await queryOne(
      "SELECT * FROM challenge_participants WHERE challenge_id = $1 AND user_id = $2 AND status = 'accepted'",
      [req.params.id, req.user.id],
    );
    if (!participant)
      return res.status(404).json({ error: "Not an accepted participant" });

    await execute(
      `UPDATE challenge_participants
     SET status = 'submitted', recording_id = $1, score = $2, submitted_at = NOW()
     WHERE id = $3`,
      [recording_id || null, score ?? null, participant.id],
    );

    // Check if all accepted participants have submitted
    const remaining = await queryOne(
      "SELECT id FROM challenge_participants WHERE challenge_id = $1 AND status = 'accepted'",
      [req.params.id],
    );

    if (!remaining) {
      // All submitted — rank by score DESC and complete
      const ranked = await queryAll(
        `SELECT cp.*, u.display_name FROM challenge_participants cp
       JOIN users u ON cp.user_id = u.id
       WHERE cp.challenge_id = $1 AND cp.status = 'submitted'
       ORDER BY cp.score DESC`,
        [req.params.id],
      );

      // Update ranks
      for (let i = 0; i < ranked.length; i++) {
        await execute(
          "UPDATE challenge_participants SET rank = $1 WHERE id = $2",
          [i + 1, ranked[i].id],
        );
      }

      await execute(
        "UPDATE challenges SET status = 'completed' WHERE id = $1",
        [req.params.id],
      );

      // Create feed events for results
      for (const p of ranked) {
        const eventId = uuid();
        await execute(
          `INSERT INTO feed_events (id, user_id, event_type, reference_id, data)
         VALUES ($1, $2, 'challenge_completed', $3, $4)`,
          [
            eventId,
            p.user_id,
            req.params.id,
            JSON.stringify({
              challenge_id: req.params.id,
              rank: p.rank,
              score: p.score,
              display_name: p.display_name,
            }),
          ],
        );
      }
    }

    const challenge = await queryOne("SELECT * FROM challenges WHERE id = $1", [
      req.params.id,
    ]);
    challenge.participants = await queryAll(
      `SELECT cp.*, u.display_name, u.instrument
     FROM challenge_participants cp
     JOIN users u ON cp.user_id = u.id
     WHERE cp.challenge_id = $1`,
      [req.params.id],
    );
    res.json(challenge);
  }),
);

// POST — generate a weekly challenge
router.post(
  "/weekly/generate",
  asyncHandler(async (req, res) => {
    // Pick a random excerpt or scale as content
    const excerpt = await queryOne(
      "SELECT * FROM excerpts WHERE user_id = $1 ORDER BY RANDOM() LIMIT 1",
      [req.user.id],
    );
    const contentType = excerpt ? "excerpt" : null;
    const contentId = excerpt ? excerpt.id : null;
    const description = excerpt
      ? `Weekly Challenge: ${excerpt.title}${excerpt.composer ? ` by ${excerpt.composer}` : ""}`
      : "Weekly Challenge";

    // Deadline = next Monday
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const deadline = new Date(now.getTime() + daysUntilMonday * 86400000);
    deadline.setHours(23, 59, 59, 0);

    const id = uuid();
    await execute(
      `INSERT INTO challenges (id, creator_id, type, content_type, content_id, description, deadline, status)
     VALUES ($1, $2, 'weekly', $3, $4, $5, $6, 'active')`,
      [
        id,
        req.user.id,
        contentType,
        contentId,
        description,
        deadline.toISOString(),
      ],
    );

    // Creator joins as accepted participant
    const partId = uuid();
    await execute(
      `INSERT INTO challenge_participants (id, challenge_id, user_id, status)
     VALUES ($1, $2, $3, 'accepted')`,
      [partId, id, req.user.id],
    );

    const challenge = await queryOne("SELECT * FROM challenges WHERE id = $1", [
      id,
    ]);
    challenge.participants = await queryAll(
      `SELECT cp.*, u.display_name, u.instrument
     FROM challenge_participants cp
     JOIN users u ON cp.user_id = u.id
     WHERE cp.challenge_id = $1`,
      [id],
    );
    res.status(201).json(challenge);
  }),
);

export default router;
