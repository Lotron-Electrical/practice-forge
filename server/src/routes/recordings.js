import { Router } from "express";
import { queryAll, queryOne, execute } from "../db/helpers.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { v4 as uuid } from "uuid";
import {
  upload,
  detectFileType,
  initialProcessingStatus,
  moveToTypeDir,
} from "../middleware/upload.js";
import path from "path";
import fs from "fs";
import { safePath, DATA_DIR } from "../utils/pathSafe.js";

const router = Router();

// POST — upload audio + create recording metadata
router.post("/", (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No file provided" });

    const fileId = uuid();
    const recordingId = uuid();
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

    try {
      // Create uploaded_files row
      await execute(
        `INSERT INTO uploaded_files (id, original_filename, file_type, mime_type, file_size_bytes, file_path, processing_status, linked_type, linked_id, notes, tags, user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          fileId,
          req.file.originalname,
          "audio",
          req.file.mimetype,
          req.file.size,
          relPath,
          status,
          req.body.linked_type || null,
          req.body.linked_id || null,
          "",
          "[]",
          req.user?.id || null,
        ],
      );

      // Create audio_recordings row
      await execute(
        `INSERT INTO audio_recordings (id, file_id, session_id, block_id, linked_type, linked_id, title, duration_seconds, target_bpm, target_key, score_file_id, start_bar, end_bar)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          recordingId,
          fileId,
          req.body.session_id || null,
          req.body.block_id || null,
          req.body.linked_type || null,
          req.body.linked_id || null,
          req.body.title || "",
          req.body.duration_seconds
            ? parseFloat(req.body.duration_seconds)
            : null,
          req.body.target_bpm ? parseInt(req.body.target_bpm) : null,
          req.body.target_key || null,
          req.body.score_file_id || null,
          req.body.start_bar ? parseInt(req.body.start_bar) : null,
          req.body.end_bar ? parseInt(req.body.end_bar) : null,
        ],
      );

      const recording = await queryOne(
        `SELECT r.*, f.file_path, f.original_filename FROM audio_recordings r LEFT JOIN uploaded_files f ON r.file_id = f.id WHERE r.id = $1`,
        [recordingId],
      );
      res.status(201).json(recording);
    } catch (dbErr) {
      try {
        fs.unlinkSync(filePath);
      } catch {}
      res
        .status(500)
        .json({ error: "Failed to save recording: " + dbErr.message });
    }
  });
});

// GET — list recordings with filters
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { linked_type, linked_id, session_id } = req.query;
    let sql = `SELECT r.*, f.file_path, f.original_filename,
    a.pitch_accuracy_pct, a.overall_rating as analysis_rating
    FROM audio_recordings r
    LEFT JOIN uploaded_files f ON r.file_id = f.id
    LEFT JOIN audio_analyses a ON a.recording_id = r.id
    WHERE 1=1`;
    const params = [];
    let idx = 1;

    if (linked_type) {
      sql += ` AND r.linked_type = $${idx++}`;
      params.push(linked_type);
    }
    if (linked_id) {
      sql += ` AND r.linked_id = $${idx++}`;
      params.push(linked_id);
    }
    if (session_id) {
      sql += ` AND r.session_id = $${idx++}`;
      params.push(session_id);
    }

    sql += " ORDER BY r.created_at DESC";
    const recordings = await queryAll(sql, params);
    res.json(recordings);
  }),
);

// GET — single recording with analysis
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const recording = await queryOne(
      `SELECT r.*, f.file_path, f.original_filename FROM audio_recordings r LEFT JOIN uploaded_files f ON r.file_id = f.id WHERE r.id = $1`,
      [req.params.id],
    );
    if (!recording) return res.status(404).json({ error: "Not found" });

    const analysis = await queryOne(
      "SELECT * FROM audio_analyses WHERE recording_id = $1",
      [req.params.id],
    );
    recording.analysis = analysis;
    res.json(recording);
  }),
);

// DELETE — delete recording + linked uploaded_file
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const recording = await queryOne(
      "SELECT * FROM audio_recordings WHERE id = $1",
      [req.params.id],
    );
    if (!recording) return res.status(404).json({ error: "Not found" });

    // Delete actual file if exists
    if (recording.file_id) {
      const file = await queryOne(
        "SELECT * FROM uploaded_files WHERE id = $1",
        [recording.file_id],
      );
      if (file) {
        const filePath = safePath(file.file_path);
        try {
          fs.unlinkSync(filePath);
        } catch {}
        await execute("DELETE FROM uploaded_files WHERE id = $1", [
          recording.file_id,
        ]);
      }
    }

    await execute("DELETE FROM audio_recordings WHERE id = $1", [
      req.params.id,
    ]);
    res.json({ deleted: true });
  }),
);

// POST — save analysis results
router.post(
  "/:id/analysis",
  asyncHandler(async (req, res) => {
    const recording = await queryOne(
      "SELECT * FROM audio_recordings WHERE id = $1",
      [req.params.id],
    );
    if (!recording)
      return res.status(404).json({ error: "Recording not found" });

    const id = uuid();
    const {
      pitch_accuracy_pct,
      rhythm_accuracy_pct,
      dynamic_range_db,
      avg_rms,
      avg_spectral_centroid,
      avg_spectral_flatness,
      pitch_stability,
      overall_rating,
      analysis_data,
    } = req.body;

    // Upsert: delete existing analysis first
    await execute("DELETE FROM audio_analyses WHERE recording_id = $1", [
      req.params.id,
    ]);

    await execute(
      `INSERT INTO audio_analyses (id, recording_id, pitch_accuracy_pct, rhythm_accuracy_pct, dynamic_range_db, avg_rms, avg_spectral_centroid, avg_spectral_flatness, pitch_stability, overall_rating, analysis_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id,
        req.params.id,
        pitch_accuracy_pct ?? null,
        rhythm_accuracy_pct ?? null,
        dynamic_range_db ?? null,
        avg_rms ?? null,
        avg_spectral_centroid ?? null,
        avg_spectral_flatness ?? null,
        pitch_stability ?? null,
        overall_rating ?? null,
        JSON.stringify(analysis_data || {}),
      ],
    );

    const analysis = await queryOne(
      "SELECT * FROM audio_analyses WHERE id = $1",
      [id],
    );
    res.status(201).json(analysis);
  }),
);

// GET — get analysis for a recording
router.get(
  "/:id/analysis",
  asyncHandler(async (req, res) => {
    const analysis = await queryOne(
      "SELECT * FROM audio_analyses WHERE recording_id = $1",
      [req.params.id],
    );
    if (!analysis) return res.status(404).json({ error: "No analysis found" });
    res.json(analysis);
  }),
);

export default router;
