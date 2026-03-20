import { Router } from "express";
import { queryAll, queryOne, execute } from "../db/helpers.js";
import { v4 as uuid } from "uuid";
import { asyncHandler } from "../utils/asyncHandler.js";
import { enforceCountLimit } from "../middleware/tierLimits.js";

const pieceLimiter = enforceCountLimit(
  "pieces",
  "SELECT COUNT(*) as count FROM pieces WHERE user_id = $1",
);

const router = Router();

// GET all pieces — bulk fetch sections + demands (fixes N+1)
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const pieces = await queryAll(
      "SELECT * FROM pieces WHERE user_id = $1 ORDER BY updated_at DESC",
      [req.user.id],
    );
    if (pieces.length === 0) return res.json([]);

    const pieceIds = pieces.map((p) => p.id);
    const sections = await queryAll(
      "SELECT * FROM sections WHERE piece_id = ANY($1) ORDER BY sort_order",
      [pieceIds],
    );
    const demands = await queryAll(
      "SELECT * FROM technical_demands WHERE piece_id = ANY($1) ORDER BY created_at",
      [pieceIds],
    );

    const sectionsByPiece = {};
    const demandsByPiece = {};
    for (const s of sections) {
      (sectionsByPiece[s.piece_id] ||= []).push(s);
    }
    for (const d of demands) {
      (demandsByPiece[d.piece_id] ||= []).push(d);
    }

    for (const p of pieces) {
      p.sections = sectionsByPiece[p.id] || [];
      p.technical_demands = demandsByPiece[p.id] || [];
    }
    res.json(pieces);
  }),
);

// GET single piece with full details — bulk fetch exercises for demands
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const piece = await queryOne(
      "SELECT * FROM pieces WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id],
    );
    if (!piece) return res.status(404).json({ error: "Not found" });
    piece.sections = await queryAll(
      "SELECT * FROM sections WHERE piece_id = $1 ORDER BY sort_order",
      [piece.id],
    );
    piece.technical_demands = await queryAll(
      "SELECT td.*, tc.name as category_name FROM technical_demands td LEFT JOIN taxonomy_categories tc ON td.category_id = tc.id WHERE td.piece_id = $1 ORDER BY td.created_at",
      [piece.id],
    );

    if (piece.technical_demands.length > 0) {
      const demandIds = piece.technical_demands.map((d) => d.id);
      const links = await queryAll(
        "SELECT de.demand_id, e.* FROM exercises e JOIN demand_exercises de ON e.id = de.exercise_id WHERE de.demand_id = ANY($1)",
        [demandIds],
      );
      const exercisesByDemand = {};
      for (const l of links) {
        (exercisesByDemand[l.demand_id] ||= []).push(l);
      }
      for (const td of piece.technical_demands) {
        td.linked_exercises = exercisesByDemand[td.id] || [];
      }
    } else {
      for (const td of piece.technical_demands) td.linked_exercises = [];
    }
    res.json(piece);
  }),
);

// POST create piece
router.post(
  "/",
  pieceLimiter,
  asyncHandler(async (req, res) => {
    const {
      title,
      composer = "",
      difficulty,
      status = "not_started",
      priority = "medium",
      target_date,
      colour_tag,
      general_notes = "",
      historical_context,
    } = req.body;
    if (!title) return res.status(400).json({ error: "title is required" });
    const id = uuid();
    await execute(
      "INSERT INTO pieces (id, user_id, title, composer, difficulty, status, priority, target_date, colour_tag, general_notes, historical_context) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
      [
        id,
        req.user.id,
        title,
        composer,
        difficulty || null,
        status,
        priority,
        target_date || null,
        colour_tag || null,
        general_notes,
        historical_context || null,
      ],
    );
    const created = await queryOne("SELECT * FROM pieces WHERE id = $1", [id]);
    created.sections = [];
    created.technical_demands = [];
    res.status(201).json(created);
  }),
);

// PUT update piece
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await queryOne(
      "SELECT * FROM pieces WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id],
    );
    if (!existing) return res.status(404).json({ error: "Not found" });
    const {
      title,
      composer,
      difficulty,
      status,
      priority,
      target_date,
      colour_tag,
      general_notes,
      historical_context,
    } = req.body;
    await execute(
      "UPDATE pieces SET title=$1, composer=$2, difficulty=$3, status=$4, priority=$5, target_date=$6, colour_tag=$7, general_notes=$8, historical_context=$9, updated_at=NOW() WHERE id=$10 AND user_id=$11",
      [
        title ?? existing.title,
        composer ?? existing.composer,
        difficulty !== undefined ? difficulty : existing.difficulty,
        status ?? existing.status,
        priority ?? existing.priority,
        target_date !== undefined ? target_date : existing.target_date,
        colour_tag !== undefined ? colour_tag : existing.colour_tag,
        general_notes ?? existing.general_notes,
        historical_context !== undefined
          ? historical_context
          : existing.historical_context,
        req.params.id,
        req.user.id,
      ],
    );
    res.json(
      await queryOne("SELECT * FROM pieces WHERE id = $1", [req.params.id]),
    );
  }),
);

// DELETE piece — also clean up orphaned session_blocks and resources
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    if (
      !(await queryOne("SELECT id FROM pieces WHERE id = $1 AND user_id = $2", [
        req.params.id,
        req.user.id,
      ]))
    )
      return res.status(404).json({ error: "Not found" });

    // Clean up orphaned references (no FK constraint on session_blocks/resources)
    const sectionIds = (
      await queryAll("SELECT id FROM sections WHERE piece_id = $1", [
        req.params.id,
      ])
    ).map((s) => s.id);
    if (sectionIds.length > 0) {
      await execute(
        "DELETE FROM session_blocks WHERE linked_type = 'section' AND linked_id = ANY($1)",
        [sectionIds],
      );
    }
    await execute(
      "DELETE FROM session_blocks WHERE linked_type = 'piece' AND linked_id = $1",
      [req.params.id],
    );
    await execute(
      "DELETE FROM resources WHERE linked_type = 'piece' AND linked_id = $1",
      [req.params.id],
    );

    await execute("DELETE FROM pieces WHERE id = $1", [req.params.id]);
    res.json({ deleted: true });
  }),
);

// --- Sections ---
router.post(
  "/:pieceId/sections",
  asyncHandler(async (req, res) => {
    const { pieceId } = req.params;
    if (
      !(await queryOne("SELECT id FROM pieces WHERE id = $1 AND user_id = $2", [
        pieceId,
        req.user.id,
      ]))
    )
      return res.status(404).json({ error: "Piece not found" });
    const {
      name,
      sort_order = 0,
      status = "not_started",
      bar_range,
      notes = "",
    } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });
    const id = uuid();
    await execute(
      "INSERT INTO sections (id, piece_id, name, sort_order, status, bar_range, notes) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [id, pieceId, name, sort_order, status, bar_range || null, notes],
    );
    res
      .status(201)
      .json(await queryOne("SELECT * FROM sections WHERE id = $1", [id]));
  }),
);

router.put(
  "/:pieceId/sections/:sectionId",
  asyncHandler(async (req, res) => {
    const existing = await queryOne(
      "SELECT * FROM sections WHERE id = $1 AND piece_id = $2",
      [req.params.sectionId, req.params.pieceId],
    );
    if (!existing) return res.status(404).json({ error: "Not found" });
    const { name, sort_order, status, bar_range, notes } = req.body;
    await execute(
      "UPDATE sections SET name=$1, sort_order=$2, status=$3, bar_range=$4, notes=$5, updated_at=NOW() WHERE id=$6",
      [
        name ?? existing.name,
        sort_order ?? existing.sort_order,
        status ?? existing.status,
        bar_range !== undefined ? bar_range : existing.bar_range,
        notes ?? existing.notes,
        req.params.sectionId,
      ],
    );
    res.json(
      await queryOne("SELECT * FROM sections WHERE id = $1", [
        req.params.sectionId,
      ]),
    );
  }),
);

router.delete(
  "/:pieceId/sections/:sectionId",
  asyncHandler(async (req, res) => {
    await execute(
      "DELETE FROM session_blocks WHERE linked_type = 'section' AND linked_id = $1",
      [req.params.sectionId],
    );
    await execute("DELETE FROM sections WHERE id = $1 AND piece_id = $2", [
      req.params.sectionId,
      req.params.pieceId,
    ]);
    res.json({ deleted: true });
  }),
);

// --- Technical Demands ---
router.post(
  "/:pieceId/demands",
  asyncHandler(async (req, res) => {
    const { pieceId } = req.params;
    if (
      !(await queryOne("SELECT id FROM pieces WHERE id = $1 AND user_id = $2", [
        pieceId,
        req.user.id,
      ]))
    )
      return res.status(404).json({ error: "Piece not found" });
    const {
      description,
      category_id,
      difficulty,
      bar_range,
      auto_detected = false,
      notes = "",
    } = req.body;
    if (!description)
      return res.status(400).json({ error: "description is required" });
    const id = uuid();
    await execute(
      "INSERT INTO technical_demands (id, piece_id, description, category_id, difficulty, bar_range, auto_detected, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [
        id,
        pieceId,
        description,
        category_id || null,
        difficulty || null,
        bar_range || null,
        auto_detected,
        notes,
      ],
    );
    const created = await queryOne(
      "SELECT * FROM technical_demands WHERE id = $1",
      [id],
    );
    created.linked_exercises = [];
    res.status(201).json(created);
  }),
);

router.put(
  "/:pieceId/demands/:demandId",
  asyncHandler(async (req, res) => {
    const existing = await queryOne(
      "SELECT * FROM technical_demands WHERE id = $1 AND piece_id = $2",
      [req.params.demandId, req.params.pieceId],
    );
    if (!existing) return res.status(404).json({ error: "Not found" });
    const { description, category_id, difficulty, bar_range, notes } = req.body;
    await execute(
      "UPDATE technical_demands SET description=$1, category_id=$2, difficulty=$3, bar_range=$4, notes=$5, updated_at=NOW() WHERE id=$6",
      [
        description ?? existing.description,
        category_id !== undefined ? category_id : existing.category_id,
        difficulty !== undefined ? difficulty : existing.difficulty,
        bar_range !== undefined ? bar_range : existing.bar_range,
        notes ?? existing.notes,
        req.params.demandId,
      ],
    );
    res.json(
      await queryOne("SELECT * FROM technical_demands WHERE id = $1", [
        req.params.demandId,
      ]),
    );
  }),
);

router.delete(
  "/:pieceId/demands/:demandId",
  asyncHandler(async (req, res) => {
    await execute(
      "DELETE FROM technical_demands WHERE id = $1 AND piece_id = $2",
      [req.params.demandId, req.params.pieceId],
    );
    res.json({ deleted: true });
  }),
);

router.post(
  "/:pieceId/demands/:demandId/exercises",
  asyncHandler(async (req, res) => {
    const { exercise_id } = req.body;
    if (!exercise_id)
      return res.status(400).json({ error: "exercise_id is required" });
    await execute(
      "INSERT INTO demand_exercises (demand_id, exercise_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [req.params.demandId, exercise_id],
    );
    res.json({ linked: true });
  }),
);

router.delete(
  "/:pieceId/demands/:demandId/exercises/:exerciseId",
  asyncHandler(async (req, res) => {
    await execute(
      "DELETE FROM demand_exercises WHERE demand_id = $1 AND exercise_id = $2",
      [req.params.demandId, req.params.exerciseId],
    );
    res.json({ unlinked: true });
  }),
);

export default router;
