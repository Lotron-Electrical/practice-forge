import { Router } from "express";
import { queryAll, queryOne, execute } from "../db/helpers.js";
import { v4 as uuid } from "uuid";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

// GET all auditions
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const rows = await queryAll(
      "SELECT * FROM auditions WHERE user_id = $1 ORDER BY audition_date DESC",
      [req.user.id],
    );
    for (const r of rows) {
      r.repertoire =
        typeof r.repertoire === "string"
          ? JSON.parse(r.repertoire)
          : r.repertoire;
    }
    res.json(rows);
  }),
);

// GET upcoming auditions (for dashboard countdown)
router.get(
  "/upcoming",
  asyncHandler(async (req, res) => {
    const today = new Date().toISOString().slice(0, 10);

    // From auditions table
    const auditions = await queryAll(
      "SELECT * FROM auditions WHERE audition_date >= $1 AND (result IS NULL OR result = 'pending') AND user_id = $2 ORDER BY audition_date ASC",
      [today, req.user.id],
    );
    for (const a of auditions) {
      a.repertoire =
        typeof a.repertoire === "string"
          ? JSON.parse(a.repertoire)
          : a.repertoire;
      a.days_until = Math.ceil(
        (new Date(a.audition_date).getTime() - Date.now()) / 86400000,
      );
    }

    // Also check pieces/excerpts with audition_date set
    const pieces = await queryAll(
      "SELECT id, title, composer, audition_date FROM pieces WHERE audition_date IS NOT NULL AND audition_date >= $1 AND user_id = $2 ORDER BY audition_date ASC",
      [today, req.user.id],
    );
    const excerpts = await queryAll(
      "SELECT id, title, composer, audition_date, status FROM excerpts WHERE audition_date IS NOT NULL AND audition_date >= $1 AND user_id = $2 ORDER BY audition_date ASC",
      [today, req.user.id],
    );

    res.json({
      auditions,
      pieces_with_dates: pieces.map((p) => ({
        ...p,
        days_until: Math.ceil(
          (new Date(p.audition_date).getTime() - Date.now()) / 86400000,
        ),
      })),
      excerpts_with_dates: excerpts.map((e) => ({
        ...e,
        days_until: Math.ceil(
          (new Date(e.audition_date).getTime() - Date.now()) / 86400000,
        ),
      })),
    });
  }),
);

// POST create audition
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { title, audition_date, notes = "", repertoire = [] } = req.body;
    if (!title || !audition_date)
      return res
        .status(400)
        .json({ error: "title and audition_date are required" });

    const id = uuid();
    await execute(
      "INSERT INTO auditions (id, title, audition_date, notes, repertoire, user_id) VALUES ($1, $2, $3, $4, $5, $6)",
      [
        id,
        title,
        audition_date,
        notes,
        JSON.stringify(repertoire),
        req.user.id,
      ],
    );

    const row = await queryOne("SELECT * FROM auditions WHERE id = $1", [id]);
    row.repertoire =
      typeof row.repertoire === "string"
        ? JSON.parse(row.repertoire)
        : row.repertoire;
    res.status(201).json(row);
  }),
);

// PUT update audition (result, notes, etc.)
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { title, audition_date, result, notes, repertoire } = req.body;
    const existing = await queryOne(
      "SELECT * FROM auditions WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id],
    );
    if (!existing) return res.status(404).json({ error: "Not found" });

    await execute(
      `UPDATE auditions SET
      title = $1, audition_date = $2, result = $3, notes = $4, repertoire = $5, updated_at = NOW()
     WHERE id = $6`,
      [
        title ?? existing.title,
        audition_date ?? existing.audition_date,
        result !== undefined ? result : existing.result,
        notes !== undefined ? notes : existing.notes,
        repertoire ? JSON.stringify(repertoire) : existing.repertoire,
        req.params.id,
      ],
    );

    const row = await queryOne("SELECT * FROM auditions WHERE id = $1", [
      req.params.id,
    ]);
    row.repertoire =
      typeof row.repertoire === "string"
        ? JSON.parse(row.repertoire)
        : row.repertoire;
    res.json(row);
  }),
);

// DELETE audition
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await queryOne(
      "SELECT * FROM auditions WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id],
    );
    if (!existing) return res.status(404).json({ error: "Not found" });
    await execute("DELETE FROM auditions WHERE id = $1 AND user_id = $2", [
      req.params.id,
      req.user.id,
    ]);
    res.json({ ok: true });
  }),
);

export default router;
