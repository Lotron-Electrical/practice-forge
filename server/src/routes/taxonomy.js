import { Router } from "express";
import { queryAll, queryOne } from "../db/helpers.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

// GET all categories (flat list — client builds tree)
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const rows = await queryAll(
      "SELECT * FROM taxonomy_categories ORDER BY sort_order, name",
    );
    res.json(rows);
  }),
);

// GET single category
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const row = await queryOne(
      "SELECT * FROM taxonomy_categories WHERE id = $1",
      [req.params.id],
    );
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  }),
);

// Taxonomy categories are system-seeded and read-only for users.
// POST/PUT/DELETE removed to prevent users corrupting shared taxonomy data.

export default router;
