import { Router } from 'express';
import { queryAll, queryOne, execute } from '../db/helpers.js';
import { v4 as uuid } from 'uuid';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// POST — create a new assessment
router.post('/', asyncHandler(async (req, res) => {
  const { type, piece_id, notes = '' } = req.body;
  if (!type) return res.status(400).json({ error: 'type is required' });

  const id = uuid();
  await execute(
    `INSERT INTO assessments (id, type, piece_id, notes) VALUES ($1, $2, $3, $4)`,
    [id, type, piece_id || null, notes]
  );
  const assessment = await queryOne('SELECT * FROM assessments WHERE id = $1', [id]);
  res.status(201).json(assessment);
}));

// GET — list assessments with filters
router.get('/', asyncHandler(async (req, res) => {
  const { type, piece_id, status } = req.query;
  let sql = 'SELECT * FROM assessments WHERE 1=1';
  const params = [];
  let idx = 1;

  if (type) { sql += ` AND type = $${idx++}`; params.push(type); }
  if (piece_id) { sql += ` AND piece_id = $${idx++}`; params.push(piece_id); }
  if (status) { sql += ` AND status = $${idx++}`; params.push(status); }

  sql += ' ORDER BY created_at DESC LIMIT 50';
  res.json(await queryAll(sql, params));
}));

// GET — single assessment with recordings
router.get('/:id', asyncHandler(async (req, res) => {
  const assessment = await queryOne('SELECT * FROM assessments WHERE id = $1', [req.params.id]);
  if (!assessment) return res.status(404).json({ error: 'Not found' });

  assessment.assessment_recordings = await queryAll(
    `SELECT ar.*, r.title as recording_title, r.duration_seconds, r.file_id
     FROM assessment_recordings ar
     LEFT JOIN audio_recordings r ON ar.recording_id = r.id
     WHERE ar.assessment_id = $1
     ORDER BY ar.sort_order`,
    [req.params.id]
  );
  res.json(assessment);
}));

// PUT — update assessment (complete, add results)
router.put('/:id', asyncHandler(async (req, res) => {
  const existing = await queryOne('SELECT * FROM assessments WHERE id = $1', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { status, overall_score, overall_rating, results, notes } = req.body;

  await execute(
    `UPDATE assessments SET status=$1, overall_score=$2, overall_rating=$3, results=$4, notes=$5,
     completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE completed_at END
     WHERE id = $6`,
    [
      status ?? existing.status,
      overall_score !== undefined ? overall_score : existing.overall_score,
      overall_rating !== undefined ? overall_rating : existing.overall_rating,
      results ? JSON.stringify(results) : existing.results,
      notes ?? existing.notes,
      req.params.id,
    ]
  );
  res.json(await queryOne('SELECT * FROM assessments WHERE id = $1', [req.params.id]));
}));

// DELETE assessment
router.delete('/:id', asyncHandler(async (req, res) => {
  if (!(await queryOne('SELECT id FROM assessments WHERE id = $1', [req.params.id])))
    return res.status(404).json({ error: 'Not found' });
  await execute('DELETE FROM assessments WHERE id = $1', [req.params.id]);
  res.json({ deleted: true });
}));

// POST — add a recording to an assessment
router.post('/:id/recordings', asyncHandler(async (req, res) => {
  const assessment = await queryOne('SELECT * FROM assessments WHERE id = $1', [req.params.id]);
  if (!assessment) return res.status(404).json({ error: 'Assessment not found' });

  const { recording_id, target_type, target_id, sort_order = 0, score, bar_results } = req.body;
  if (!target_type || !target_id) return res.status(400).json({ error: 'target_type and target_id required' });

  const id = uuid();
  await execute(
    `INSERT INTO assessment_recordings (id, assessment_id, recording_id, target_type, target_id, sort_order, score, bar_results)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, req.params.id, recording_id || null, target_type, target_id, sort_order,
     score ?? null, bar_results ? JSON.stringify(bar_results) : null]
  );

  res.status(201).json(await queryOne('SELECT * FROM assessment_recordings WHERE id = $1', [id]));
}));

// POST — generate excerpt spot-check (random selection)
router.post('/generate/spot-check', asyncHandler(async (req, res) => {
  const { count = 5 } = req.body;
  const excerpts = await queryAll(
    "SELECT * FROM excerpts ORDER BY RANDOM() LIMIT $1",
    [Math.min(Math.max(count, 3), 10)]
  );

  if (excerpts.length === 0) return res.status(400).json({ error: 'No excerpts in library' });

  const id = uuid();
  await execute(
    `INSERT INTO assessments (id, type, results) VALUES ($1, 'excerpt_spot_check', $2)`,
    [id, JSON.stringify({ excerpts: excerpts.map(e => ({ id: e.id, title: e.title, composer: e.composer, status: e.status })) })]
  );

  const assessment = await queryOne('SELECT * FROM assessments WHERE id = $1', [id]);
  assessment.excerpts = excerpts;
  res.status(201).json(assessment);
}));

// POST — generate weekly review
router.post('/generate/weekly-review', asyncHandler(async (req, res) => {
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  // Gather week's data
  const sessions = await queryAll(
    "SELECT * FROM practice_sessions WHERE date >= $1 AND status = 'completed'",
    [weekAgo]
  );
  const totalMin = sessions.reduce((s, sess) => s + (sess.actual_duration_min || sess.planned_duration_min || 0), 0);

  // Blocks by category
  const sessionIds = sessions.map(s => s.id);
  let categoryBreakdown = {};
  if (sessionIds.length > 0) {
    const blocks = await queryAll(
      "SELECT category, SUM(COALESCE(actual_duration_min, planned_duration_min)) as total_min FROM session_blocks WHERE session_id = ANY($1) AND status = 'completed' GROUP BY category",
      [sessionIds]
    );
    categoryBreakdown = Object.fromEntries(blocks.map(b => [b.category, parseInt(b.total_min)]));
  }

  // Status changes
  const recentPieceChanges = await queryAll(
    "SELECT title, status FROM pieces WHERE updated_at >= $1 ORDER BY updated_at DESC LIMIT 5",
    [weekAgo]
  );
  const recentSectionChanges = await queryAll(
    "SELECT s.name, s.status, p.title as piece_title FROM sections s JOIN pieces p ON s.piece_id = p.id WHERE s.updated_at >= $1 ORDER BY s.updated_at DESC LIMIT 10",
    [weekAgo]
  );

  // Recordings this week
  const recordings = await queryAll(
    "SELECT r.*, a.pitch_accuracy_pct, a.overall_rating FROM audio_recordings r LEFT JOIN audio_analyses a ON a.recording_id = r.id WHERE r.created_at >= $1 ORDER BY r.created_at DESC",
    [weekAgo]
  );

  const results = {
    period: { from: weekAgo, to: new Date().toISOString().slice(0, 10) },
    sessions_completed: sessions.length,
    total_practice_minutes: totalMin,
    total_practice_hours: +(totalMin / 60).toFixed(1),
    category_breakdown: categoryBreakdown,
    status_changes: { pieces: recentPieceChanges, sections: recentSectionChanges },
    recordings_made: recordings.length,
    avg_pitch_accuracy: recordings.length > 0
      ? +(recordings.filter(r => r.pitch_accuracy_pct != null).reduce((s, r) => s + r.pitch_accuracy_pct, 0) / Math.max(1, recordings.filter(r => r.pitch_accuracy_pct != null).length)).toFixed(1)
      : null,
  };

  const id = uuid();
  await execute(
    `INSERT INTO assessments (id, type, status, results, completed_at) VALUES ($1, 'weekly_review', 'completed', $2, NOW())`,
    [id, JSON.stringify(results)]
  );

  res.status(201).json(await queryOne('SELECT * FROM assessments WHERE id = $1', [id]));
}));

// GET — comparison data for piece audits
router.get('/compare/:pieceId', asyncHandler(async (req, res) => {
  const audits = await queryAll(
    "SELECT id, overall_score, overall_rating, results, completed_at FROM assessments WHERE type = 'piece_audit' AND piece_id = $1 AND status = 'completed' ORDER BY completed_at DESC LIMIT 10",
    [req.params.pieceId]
  );
  res.json(audits);
}));

export default router;
