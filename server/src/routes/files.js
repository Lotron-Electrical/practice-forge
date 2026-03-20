import { Router } from "express";
import { queryAll, queryOne, execute } from "../db/helpers.js";
import { v4 as uuid } from "uuid";
import {
  upload,
  detectFileType,
  initialProcessingStatus,
  moveToTypeDir,
} from "../middleware/upload.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { safePath, DATA_DIR } from "../utils/pathSafe.js";
import path from "path";
import fs from "fs";

const router = Router();

// POST — upload a file
router.post("/", (req, res, next) => {
  upload.single("file")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No file provided" });

    const id = uuid();
    const ext = path.extname(req.file.originalname).toLowerCase();
    const fileType = detectFileType(req.file.mimetype, ext);
    const status = initialProcessingStatus(fileType);

    let filePath;
    try {
      filePath = moveToTypeDir(req.file.path, fileType, req.file.filename);
    } catch {
      filePath = req.file.path;
    }

    const relPath = filePath.split(/[/\\]data[/\\]/)[1] || filePath;

    const linkedType = req.body.linked_type || null;
    const linkedId = req.body.linked_id || null;
    const notes = req.body.notes || "";
    const tags = req.body.tags || "[]";

    try {
      await execute(
        `INSERT INTO uploaded_files (id, original_filename, file_type, mime_type, file_size_bytes, file_path, processing_status, linked_type, linked_id, notes, tags, user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          id,
          req.file.originalname,
          fileType,
          req.file.mimetype,
          req.file.size,
          relPath,
          status,
          linkedType,
          linkedId,
          notes,
          tags,
          req.user?.id || null,
        ],
      );
      const created = await queryOne(
        "SELECT * FROM uploaded_files WHERE id = $1",
        [id],
      );
      res.status(201).json(created);
    } catch (dbErr) {
      try {
        fs.unlinkSync(filePath);
      } catch {}
      next(dbErr);
    }
  });
});

// GET — list files with filters
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { file_type, linked_type, linked_id, search, processing_status } =
      req.query;
    let sql = "SELECT * FROM uploaded_files WHERE 1=1";
    const params = [];
    let idx = 1;

    sql += ` AND user_id = $${idx++}`;
    params.push(req.user.id);

    if (file_type) {
      sql += ` AND file_type = $${idx++}`;
      params.push(file_type);
    }
    if (linked_type) {
      sql += ` AND linked_type = $${idx++}`;
      params.push(linked_type);
    }
    if (linked_id) {
      sql += ` AND linked_id = $${idx++}`;
      params.push(linked_id);
    }
    if (processing_status) {
      sql += ` AND processing_status = $${idx++}`;
      params.push(processing_status);
    }
    if (search) {
      sql += ` AND (original_filename ILIKE $${idx} OR notes ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    sql += " ORDER BY uploaded_at DESC";
    const files = await queryAll(sql, params);
    res.json(files);
  }),
);

// GET — single file metadata
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const file = await queryOne(
      "SELECT * FROM uploaded_files WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id],
    );
    if (!file) return res.status(404).json({ error: "Not found" });
    res.json(file);
  }),
);

// GET — download file (with path traversal protection)
router.get(
  "/:id/download",
  asyncHandler(async (req, res) => {
    const file = await queryOne(
      "SELECT * FROM uploaded_files WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id],
    );
    if (!file) return res.status(404).json({ error: "Not found" });

    const filePath = safePath(file.file_path);
    if (!fs.existsSync(filePath))
      return res.status(404).json({ error: "File not found on disk" });
    res.download(filePath, file.original_filename);
  }),
);

// PUT — update file metadata
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await queryOne(
      "SELECT * FROM uploaded_files WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id],
    );
    if (!existing) return res.status(404).json({ error: "Not found" });

    const { notes, tags, file_type, linked_type, linked_id } = req.body;
    await execute(
      "UPDATE uploaded_files SET notes=$1, tags=$2, file_type=$3, linked_type=$4, linked_id=$5 WHERE id=$6",
      [
        notes !== undefined ? notes : existing.notes,
        tags !== undefined
          ? typeof tags === "string"
            ? tags
            : JSON.stringify(tags)
          : existing.tags,
        file_type ?? existing.file_type,
        linked_type !== undefined ? linked_type : existing.linked_type,
        linked_id !== undefined ? linked_id : existing.linked_id,
        req.params.id,
      ],
    );
    res.json(
      await queryOne("SELECT * FROM uploaded_files WHERE id = $1", [
        req.params.id,
      ]),
    );
  }),
);

// DELETE — remove file and DB row
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const file = await queryOne(
      "SELECT * FROM uploaded_files WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id],
    );
    if (!file) return res.status(404).json({ error: "Not found" });

    try {
      const filePath = safePath(file.file_path);
      fs.unlinkSync(filePath);
    } catch {}

    await execute("DELETE FROM uploaded_files WHERE id = $1 AND user_id = $2", [
      req.params.id,
      req.user.id,
    ]);
    res.json({ deleted: true });
  }),
);

// POST — link file to entity
router.post(
  "/:id/link",
  asyncHandler(async (req, res) => {
    const file = await queryOne("SELECT * FROM uploaded_files WHERE id = $1", [
      req.params.id,
    ]);
    if (!file) return res.status(404).json({ error: "Not found" });

    const { linked_type, linked_id } = req.body;
    await execute(
      "UPDATE uploaded_files SET linked_type=$1, linked_id=$2 WHERE id=$3",
      [linked_type, linked_id, req.params.id],
    );
    res.json(
      await queryOne("SELECT * FROM uploaded_files WHERE id = $1", [
        req.params.id,
      ]),
    );
  }),
);

// DELETE — unlink file
router.delete(
  "/:id/link",
  asyncHandler(async (req, res) => {
    const file = await queryOne("SELECT * FROM uploaded_files WHERE id = $1", [
      req.params.id,
    ]);
    if (!file) return res.status(404).json({ error: "Not found" });

    await execute(
      "UPDATE uploaded_files SET linked_type=NULL, linked_id=NULL WHERE id=$1",
      [req.params.id],
    );
    res.json(
      await queryOne("SELECT * FROM uploaded_files WHERE id = $1", [
        req.params.id,
      ]),
    );
  }),
);

// GET — serve MusicXML content for OSMD rendering
router.get(
  "/:id/musicxml",
  asyncHandler(async (req, res) => {
    const file = await queryOne("SELECT * FROM uploaded_files WHERE id = $1", [
      req.params.id,
    ]);
    if (!file) return res.status(404).json({ error: "Not found" });

    if (file.file_type === "sheet_music_digital") {
      const filePath = safePath(file.file_path);
      if (!fs.existsSync(filePath))
        return res.status(404).json({ error: "File not found on disk" });
      res.setHeader("Content-Type", "application/xml");
      return res.sendFile(filePath);
    }

    const omr = await queryOne(
      "SELECT * FROM omr_results WHERE file_id = $1 ORDER BY created_at DESC LIMIT 1",
      [req.params.id],
    );
    if (!omr || !omr.musicxml_path)
      return res
        .status(404)
        .json({ error: "No MusicXML available. Run OMR first." });

    const xmlPath = safePath(omr.musicxml_path);
    if (!fs.existsSync(xmlPath))
      return res.status(404).json({ error: "MusicXML file not found on disk" });
    res.setHeader("Content-Type", "application/xml");
    res.sendFile(xmlPath);
  }),
);

export default router;
