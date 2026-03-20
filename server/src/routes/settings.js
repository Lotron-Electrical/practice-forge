import { Router } from "express";
import { queryAll, queryOne, execute } from "../db/helpers.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

// GET all settings
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const rows = await queryAll(
      "SELECT key, value FROM settings WHERE user_id = $1 OR user_id IS NULL ORDER BY user_id NULLS FIRST",
      [req.user.id],
    );
    const settings = {};
    for (const row of rows) {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    }
    res.json(settings);
  }),
);

// PUT update a setting
router.put(
  "/:key",
  asyncHandler(async (req, res) => {
    const { key } = req.params;
    const { value } = req.body;
    const serialized = JSON.stringify(value);
    const existing = await queryOne(
      "SELECT key FROM settings WHERE key = $1 AND user_id = $2",
      [key, req.user.id],
    );
    if (existing) {
      await execute(
        "UPDATE settings SET value = $1, updated_at = NOW() WHERE key = $2 AND user_id = $3",
        [serialized, key, req.user.id],
      );
    } else {
      await execute(
        "INSERT INTO settings (key, value, user_id) VALUES ($1, $2, $3)",
        [key, serialized, req.user.id],
      );
    }
    res.json({ key, value });
  }),
);

export default router;
