import { Router } from "express";
import { queryAll, queryOne, execute } from "../db/helpers.js";
import { v4 as uuid } from "uuid";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

// GET / — List community themes
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const sort = req.query.sort === "recent" ? "recent" : "popular";
    const orderBy =
      sort === "recent"
        ? "ct.created_at DESC"
        : "ct.favorites_count DESC, ct.downloads_count DESC";

    const themes = await queryAll(
      `SELECT ct.*, u.display_name AS creator_name,
            CASE WHEN tf.user_id IS NOT NULL THEN true ELSE false END AS is_favorited
     FROM community_themes ct
     JOIN users u ON ct.creator_id = u.id
     LEFT JOIN theme_favorites tf ON tf.theme_id = ct.id AND tf.user_id = $1
     ORDER BY ${orderBy}`,
      [req.user.id],
    );
    res.json(themes);
  }),
);

// GET /:id — Single theme
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const theme = await queryOne(
      `SELECT ct.*, u.display_name AS creator_name,
            CASE WHEN tf.user_id IS NOT NULL THEN true ELSE false END AS is_favorited
     FROM community_themes ct
     JOIN users u ON ct.creator_id = u.id
     LEFT JOIN theme_favorites tf ON tf.theme_id = ct.id AND tf.user_id = $1
     WHERE ct.id = $2`,
      [req.user.id, req.params.id],
    );
    if (!theme) return res.status(404).json({ error: "Theme not found" });
    res.json(theme);
  }),
);

// POST / — Create theme
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, description, base_theme, tokens, tags } = req.body;
    if (!name || !name.trim())
      return res.status(400).json({ error: "Name is required" });
    if (!tokens) return res.status(400).json({ error: "Tokens are required" });

    const id = uuid();
    await execute(
      `INSERT INTO community_themes (id, creator_id, name, description, base_theme, tokens, tags)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        req.user.id,
        name.trim(),
        description || "",
        base_theme || "light",
        JSON.stringify(tokens),
        JSON.stringify(tags || []),
      ],
    );
    const theme = await queryOne(
      "SELECT * FROM community_themes WHERE id = $1",
      [id],
    );
    res.status(201).json(theme);
  }),
);

// PUT /:id — Update theme (owner only)
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await queryOne(
      "SELECT * FROM community_themes WHERE id = $1",
      [req.params.id],
    );
    if (!existing) return res.status(404).json({ error: "Theme not found" });
    if (existing.creator_id !== req.user.id)
      return res.status(403).json({ error: "Not authorized" });

    const { name, description, base_theme, tokens, tags } = req.body;
    await execute(
      `UPDATE community_themes
     SET name = COALESCE($1, name),
         description = COALESCE($2, description),
         base_theme = COALESCE($3, base_theme),
         tokens = COALESCE($4, tokens),
         tags = COALESCE($5, tags),
         updated_at = NOW()
     WHERE id = $6`,
      [
        name || null,
        description !== undefined ? description : null,
        base_theme || null,
        tokens ? JSON.stringify(tokens) : null,
        tags ? JSON.stringify(tags) : null,
        req.params.id,
      ],
    );
    const updated = await queryOne(
      "SELECT * FROM community_themes WHERE id = $1",
      [req.params.id],
    );
    res.json(updated);
  }),
);

// DELETE /:id — Delete theme (owner only)
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await queryOne(
      "SELECT * FROM community_themes WHERE id = $1",
      [req.params.id],
    );
    if (!existing) return res.status(404).json({ error: "Theme not found" });
    if (existing.creator_id !== req.user.id)
      return res.status(403).json({ error: "Not authorized" });

    await execute("DELETE FROM community_themes WHERE id = $1", [
      req.params.id,
    ]);
    res.json({ deleted: true });
  }),
);

// POST /:id/favorite — Toggle favorite
router.post(
  "/:id/favorite",
  asyncHandler(async (req, res) => {
    const theme = await queryOne(
      "SELECT id FROM community_themes WHERE id = $1",
      [req.params.id],
    );
    if (!theme) return res.status(404).json({ error: "Theme not found" });

    const existing = await queryOne(
      "SELECT user_id FROM theme_favorites WHERE user_id = $1 AND theme_id = $2",
      [req.user.id, req.params.id],
    );

    if (existing) {
      await execute(
        "DELETE FROM theme_favorites WHERE user_id = $1 AND theme_id = $2",
        [req.user.id, req.params.id],
      );
      await execute(
        "UPDATE community_themes SET favorites_count = GREATEST(favorites_count - 1, 0) WHERE id = $1",
        [req.params.id],
      );
      res.json({ favorited: false });
    } else {
      await execute(
        "INSERT INTO theme_favorites (user_id, theme_id) VALUES ($1, $2)",
        [req.user.id, req.params.id],
      );
      await execute(
        "UPDATE community_themes SET favorites_count = favorites_count + 1 WHERE id = $1",
        [req.params.id],
      );
      res.json({ favorited: true });
    }
  }),
);

// POST /:id/download — Increment download count and return theme
router.post(
  "/:id/download",
  asyncHandler(async (req, res) => {
    await execute(
      "UPDATE community_themes SET downloads_count = downloads_count + 1 WHERE id = $1",
      [req.params.id],
    );
    const theme = await queryOne(
      "SELECT * FROM community_themes WHERE id = $1",
      [req.params.id],
    );
    if (!theme) return res.status(404).json({ error: "Theme not found" });
    res.json(theme);
  }),
);

export default router;
