import { Router } from "express";
import { queryAll, queryOne, execute } from "../db/helpers.js";
import { v4 as uuid } from "uuid";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

// GET / — List all excerpts with aggregated community data
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const excerpts = await queryAll(
      `SELECT e.*,
            COALESCE(AVG(ecr.difficulty_rating), 0) AS avg_difficulty,
            COUNT(DISTINCT ecr.id) AS rating_count,
            COUNT(DISTINCT ecn.id) AS note_count
     FROM excerpts e
     LEFT JOIN excerpt_community_ratings ecr ON ecr.excerpt_id = e.id
     LEFT JOIN excerpt_community_notes ecn ON ecn.excerpt_id = e.id
     GROUP BY e.id
     ORDER BY e.created_at DESC`,
    );
    res.json(excerpts);
  }),
);

// GET /:id/community — Community data for one excerpt
router.get(
  "/:id/community",
  asyncHandler(async (req, res) => {
    const stats = await queryOne(
      `SELECT COALESCE(AVG(ecr.difficulty_rating), 0) AS avg_difficulty,
            COUNT(ecr.id) AS rating_count
     FROM excerpt_community_ratings ecr
     WHERE ecr.excerpt_id = $1`,
      [req.params.id],
    );

    const notes = await queryAll(
      `SELECT ecn.*, u.display_name
     FROM excerpt_community_notes ecn
     JOIN users u ON ecn.user_id = u.id
     WHERE ecn.excerpt_id = $1
     ORDER BY ecn.upvotes DESC, ecn.created_at DESC`,
      [req.params.id],
    );

    const userRating = await queryOne(
      `SELECT difficulty_rating FROM excerpt_community_ratings
     WHERE excerpt_id = $1 AND user_id = $2`,
      [req.params.id, req.user.id],
    );

    res.json({
      avg_difficulty: parseFloat(stats.avg_difficulty) || 0,
      rating_count: parseInt(stats.rating_count, 10),
      notes,
      user_rating: userRating ? userRating.difficulty_rating : null,
    });
  }),
);

// POST /:id/rate — Upsert difficulty rating
router.post(
  "/:id/rate",
  asyncHandler(async (req, res) => {
    const { difficulty_rating } = req.body;
    if (!difficulty_rating || difficulty_rating < 1 || difficulty_rating > 10) {
      return res
        .status(400)
        .json({ error: "difficulty_rating must be between 1 and 10" });
    }

    const id = uuid();
    await execute(
      `INSERT INTO excerpt_community_ratings (id, excerpt_id, user_id, difficulty_rating)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (excerpt_id, user_id) DO UPDATE SET difficulty_rating = $4`,
      [id, req.params.id, req.user.id, difficulty_rating],
    );
    res.json({ excerpt_id: req.params.id, difficulty_rating });
  }),
);

// POST /:id/notes — Add a note
router.post(
  "/:id/notes",
  asyncHandler(async (req, res) => {
    const { note } = req.body;
    if (!note || !note.trim())
      return res.status(400).json({ error: "Note is required" });

    const id = uuid();
    await execute(
      `INSERT INTO excerpt_community_notes (id, excerpt_id, user_id, note)
     VALUES ($1, $2, $3, $4)`,
      [id, req.params.id, req.user.id, note.trim()],
    );
    const created = await queryOne(
      "SELECT * FROM excerpt_community_notes WHERE id = $1",
      [id],
    );
    res.status(201).json(created);
  }),
);

// DELETE /notes/:noteId — Delete own note only
router.delete(
  "/notes/:noteId",
  asyncHandler(async (req, res) => {
    const note = await queryOne(
      "SELECT * FROM excerpt_community_notes WHERE id = $1",
      [req.params.noteId],
    );
    if (!note) return res.status(404).json({ error: "Note not found" });
    if (note.user_id !== req.user.id)
      return res.status(403).json({ error: "Not authorized" });

    await execute("DELETE FROM excerpt_community_notes WHERE id = $1", [
      req.params.noteId,
    ]);
    res.json({ deleted: true });
  }),
);

// POST /notes/:noteId/upvote — Increment upvotes
router.post(
  "/notes/:noteId/upvote",
  asyncHandler(async (req, res) => {
    const note = await queryOne(
      "SELECT id FROM excerpt_community_notes WHERE id = $1",
      [req.params.noteId],
    );
    if (!note) return res.status(404).json({ error: "Note not found" });

    await execute(
      "UPDATE excerpt_community_notes SET upvotes = upvotes + 1 WHERE id = $1",
      [req.params.noteId],
    );
    const updated = await queryOne(
      "SELECT * FROM excerpt_community_notes WHERE id = $1",
      [req.params.noteId],
    );
    res.json(updated);
  }),
);

export default router;
