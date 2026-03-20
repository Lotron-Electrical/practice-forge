import { Router } from "express";
import { queryAll, queryOne, execute } from "../db/helpers.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { v4 as uuid } from "uuid";

const router = Router();

// GET all exercises with optional filters
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const {
      category_id,
      source_type,
      difficulty_min,
      difficulty_max,
      key: keyFilter,
      search,
    } = req.query;
    let sql =
      "SELECT e.*, tc.name as category_name FROM exercises e LEFT JOIN taxonomy_categories tc ON e.category_id = tc.id WHERE 1=1";
    const params = [];
    let n = 0;

    if (category_id) {
      n++;
      sql += ` AND e.category_id = $${n}`;
      params.push(category_id);
    }
    if (source_type) {
      n++;
      sql += ` AND e.source_type = $${n}`;
      params.push(source_type);
    }
    if (difficulty_min) {
      n++;
      sql += ` AND e.difficulty >= $${n}`;
      params.push(Number(difficulty_min));
    }
    if (difficulty_max) {
      n++;
      sql += ` AND e.difficulty <= $${n}`;
      params.push(Number(difficulty_max));
    }
    if (keyFilter) {
      n++;
      sql += ` AND e.key = $${n}`;
      params.push(keyFilter);
    }
    if (search) {
      const s = `%${search}%`;
      sql += ` AND (e.title ILIKE $${n + 1} OR e.description ILIKE $${n + 2} OR e.source ILIKE $${n + 3})`;
      params.push(s, s, s);
      n += 3;
    }

    sql += " ORDER BY e.updated_at DESC";
    res.json(await queryAll(sql, params));
  }),
);

// GET single exercise
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const ex = await queryOne(
      "SELECT e.*, tc.name as category_name FROM exercises e LEFT JOIN taxonomy_categories tc ON e.category_id = tc.id WHERE e.id = $1",
      [req.params.id],
    );
    if (!ex) return res.status(404).json({ error: "Not found" });
    ex.linked_demands = await queryAll(
      "SELECT td.*, p.title as piece_title FROM technical_demands td JOIN demand_exercises de ON td.id = de.demand_id JOIN pieces p ON td.piece_id = p.id WHERE de.exercise_id = $1",
      [ex.id],
    );
    res.json(ex);
  }),
);

// POST create exercise
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const {
      title,
      source = "",
      source_type = "manual",
      category_id,
      secondary_categories = [],
      key,
      difficulty,
      description = "",
      tags = [],
      notation_data,
      notation_format = "none",
      generation_context,
    } = req.body;
    if (!title) return res.status(400).json({ error: "title is required" });
    const id = uuid();
    await execute(
      "INSERT INTO exercises (id, title, source, source_type, category_id, secondary_categories, key, difficulty, description, tags, notation_data, notation_format, generation_context) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)",
      [
        id,
        title,
        source,
        source_type,
        category_id || null,
        JSON.stringify(secondary_categories),
        key || null,
        difficulty || null,
        description,
        JSON.stringify(tags),
        notation_data || null,
        notation_format,
        generation_context ? JSON.stringify(generation_context) : null,
      ],
    );
    res
      .status(201)
      .json(await queryOne("SELECT * FROM exercises WHERE id = $1", [id]));
  }),
);

// PUT update exercise
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await queryOne("SELECT * FROM exercises WHERE id = $1", [
      req.params.id,
    ]);
    if (!existing) return res.status(404).json({ error: "Not found" });
    const {
      title,
      source,
      source_type,
      category_id,
      secondary_categories,
      key,
      difficulty,
      description,
      tags,
      notation_data,
      notation_format,
    } = req.body;
    await execute(
      "UPDATE exercises SET title=$1, source=$2, source_type=$3, category_id=$4, secondary_categories=$5, key=$6, difficulty=$7, description=$8, tags=$9, notation_data=$10, notation_format=$11, updated_at=NOW() WHERE id=$12",
      [
        title ?? existing.title,
        source ?? existing.source,
        source_type ?? existing.source_type,
        category_id !== undefined ? category_id : existing.category_id,
        secondary_categories
          ? JSON.stringify(secondary_categories)
          : existing.secondary_categories,
        key !== undefined ? key : existing.key,
        difficulty !== undefined ? difficulty : existing.difficulty,
        description ?? existing.description,
        tags ? JSON.stringify(tags) : existing.tags,
        notation_data !== undefined ? notation_data : existing.notation_data,
        notation_format ?? existing.notation_format,
        req.params.id,
      ],
    );
    res.json(
      await queryOne("SELECT * FROM exercises WHERE id = $1", [req.params.id]),
    );
  }),
);

// DELETE exercise
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    if (
      !(await queryOne("SELECT id FROM exercises WHERE id = $1", [
        req.params.id,
      ]))
    )
      return res.status(404).json({ error: "Not found" });
    await execute(
      "DELETE FROM session_blocks WHERE linked_type = 'exercise' AND linked_id = $1",
      [req.params.id],
    );
    await execute("DELETE FROM exercises WHERE id = $1", [req.params.id]);
    res.json({ deleted: true });
  }),
);

export default router;
