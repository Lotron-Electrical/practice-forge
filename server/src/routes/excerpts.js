import { Router } from "express";
import { queryAll, queryOne, execute } from "../db/helpers.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { v4 as uuid } from "uuid";
import { enforceCountLimit } from "../middleware/tierLimits.js";

const excerptLimiter = enforceCountLimit(
  "excerpts",
  "SELECT COUNT(*) as count FROM excerpts",
);

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await queryAll("SELECT * FROM excerpts ORDER BY updated_at DESC"));
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const ex = await queryOne("SELECT * FROM excerpts WHERE id = $1", [
      req.params.id,
    ]);
    if (!ex) return res.status(404).json({ error: "Not found" });
    res.json(ex);
  }),
);

router.post(
  "/",
  excerptLimiter,
  asyncHandler(async (req, res) => {
    const {
      title,
      composer = "",
      full_work_title = "",
      location_in_score = "",
      recording_reference,
      historical_context = "",
      performance_notes = "",
      difficulty,
      status = "needs_work",
      tags = [],
    } = req.body;
    if (!title) return res.status(400).json({ error: "title is required" });
    const id = uuid();
    await execute(
      "INSERT INTO excerpts (id, title, composer, full_work_title, location_in_score, recording_reference, historical_context, performance_notes, difficulty, status, tags) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
      [
        id,
        title,
        composer,
        full_work_title,
        location_in_score,
        recording_reference || null,
        historical_context,
        performance_notes,
        difficulty || null,
        status,
        JSON.stringify(tags),
      ],
    );
    res
      .status(201)
      .json(await queryOne("SELECT * FROM excerpts WHERE id = $1", [id]));
  }),
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await queryOne("SELECT * FROM excerpts WHERE id = $1", [
      req.params.id,
    ]);
    if (!existing) return res.status(404).json({ error: "Not found" });
    const {
      title,
      composer,
      full_work_title,
      location_in_score,
      recording_reference,
      historical_context,
      performance_notes,
      difficulty,
      status,
      tags,
    } = req.body;
    await execute(
      "UPDATE excerpts SET title=$1, composer=$2, full_work_title=$3, location_in_score=$4, recording_reference=$5, historical_context=$6, performance_notes=$7, difficulty=$8, status=$9, tags=$10, updated_at=NOW() WHERE id=$11",
      [
        title ?? existing.title,
        composer ?? existing.composer,
        full_work_title ?? existing.full_work_title,
        location_in_score ?? existing.location_in_score,
        recording_reference !== undefined
          ? recording_reference
          : existing.recording_reference,
        historical_context ?? existing.historical_context,
        performance_notes ?? existing.performance_notes,
        difficulty !== undefined ? difficulty : existing.difficulty,
        status ?? existing.status,
        tags ? JSON.stringify(tags) : existing.tags,
        req.params.id,
      ],
    );
    res.json(
      await queryOne("SELECT * FROM excerpts WHERE id = $1", [req.params.id]),
    );
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    if (
      !(await queryOne("SELECT id FROM excerpts WHERE id = $1", [
        req.params.id,
      ]))
    )
      return res.status(404).json({ error: "Not found" });
    await execute(
      "DELETE FROM session_blocks WHERE linked_type = 'excerpt' AND linked_id = $1",
      [req.params.id],
    );
    await execute(
      "DELETE FROM uploaded_files WHERE linked_type = 'excerpt' AND linked_id = $1",
      [req.params.id],
    );
    await execute("DELETE FROM excerpts WHERE id = $1", [req.params.id]);
    res.json({ deleted: true });
  }),
);

export default router;
