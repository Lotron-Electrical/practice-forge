import { Router } from 'express';
import { queryAll, queryOne, execute } from '../db/helpers.js';
import { v4 as uuid } from 'uuid';

const router = Router();

// GET today's rotation
router.get('/rotation/today', async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  let rotation = await queryAll(
    'SELECT rl.*, e.title, e.composer, e.status, e.difficulty, e.full_work_title, e.location_in_score FROM excerpt_rotation_log rl JOIN excerpts e ON rl.excerpt_id = e.id WHERE rl.date = $1 ORDER BY rl.created_at',
    [today]
  );

  if (rotation.length === 0) {
    const countRow = await queryOne("SELECT value FROM settings WHERE key = 'excerptRotationCount'");
    const count = countRow ? JSON.parse(countRow.value) : 3;

    const excerpts = await queryAll(`
      SELECT e.*,
        COALESCE(e.last_practiced, '2000-01-01') as last_p,
        CASE e.status
          WHEN 'needs_work' THEN 4
          WHEN 'acceptable' THEN 3
          WHEN 'solid' THEN 2
          WHEN 'audition_ready' THEN 1
        END as status_priority
      FROM excerpts e
      ORDER BY last_p ASC, status_priority DESC, e.difficulty DESC
    `);

    const selected = [];
    const statusSeen = new Set();
    for (const ex of excerpts) {
      if (selected.length >= count) break;
      if (!statusSeen.has(ex.status) || selected.length < count) {
        selected.push(ex);
        statusSeen.add(ex.status);
      }
    }

    for (const ex of selected) {
      const id = uuid();
      await execute(
        'INSERT INTO excerpt_rotation_log (id, date, excerpt_id) VALUES ($1, $2, $3)',
        [id, today, ex.id]
      );
    }

    rotation = await queryAll(
      'SELECT rl.*, e.title, e.composer, e.status, e.difficulty, e.full_work_title, e.location_in_score FROM excerpt_rotation_log rl JOIN excerpts e ON rl.excerpt_id = e.id WHERE rl.date = $1 ORDER BY rl.created_at',
      [today]
    );
  }

  res.json(rotation);
});

// POST mark excerpt as practiced in today's rotation
router.post('/rotation/:rotationId/practiced', async (req, res) => {
  const { rotationId } = req.params;
  const row = await queryOne('SELECT * FROM excerpt_rotation_log WHERE id = $1', [rotationId]);
  if (!row) return res.status(404).json({ error: 'Not found' });

  await execute('UPDATE excerpt_rotation_log SET practiced = TRUE WHERE id = $1', [rotationId]);
  await execute(
    "UPDATE excerpts SET last_practiced = CURRENT_DATE::TEXT, times_practiced = times_practiced + 1, updated_at = NOW() WHERE id = $1",
    [row.excerpt_id]
  );

  res.json({ ok: true });
});

// POST generate a practice session
router.post('/generate', async (req, res) => {
  const { duration_min = 60 } = req.body;

  const allocRow = await queryOne("SELECT value FROM settings WHERE key = 'timeAllocation'");
  const alloc = allocRow ? JSON.parse(allocRow.value) : { warmup: 10, fundamentals: 10, technique: 25, repertoire: 35, excerpts: 15, buffer: 5 };

  const minutes = {};
  for (const [cat, pct] of Object.entries(alloc)) {
    minutes[cat] = Math.round((pct / 100) * duration_min);
  }

  const blocks = [];
  let order = 0;

  // 1. Warm-up
  if (minutes.warmup > 0) {
    blocks.push({
      id: uuid(), category: 'warmup', title: 'Warm-up',
      description: 'Long tones, gentle scales, breathing exercises',
      planned_duration_min: minutes.warmup, sort_order: order++, status: 'pending',
    });
  }

  // 2. Fundamentals
  if (minutes.fundamentals > 0) {
    const fundExercises = await queryAll(
      "SELECT e.*, tc.name as category_name FROM exercises e LEFT JOIN taxonomy_categories tc ON e.category_id = tc.id WHERE e.category_id IN ('scales','scales-major','scales-minor-harmonic','scales-chromatic','tone','tone-long','tone-dynamics') ORDER BY e.last_used ASC NULLS FIRST, e.times_used ASC LIMIT 3"
    );
    if (fundExercises.length > 0) {
      const perEx = Math.round(minutes.fundamentals / fundExercises.length);
      for (const ex of fundExercises) {
        blocks.push({
          id: uuid(), category: 'fundamentals', title: ex.title,
          description: `${ex.category_name || 'Fundamentals'} — ${ex.source || 'Exercise library'}`,
          planned_duration_min: perEx, sort_order: order++, status: 'pending',
          linked_type: 'exercise', linked_id: ex.id,
        });
      }
    } else {
      blocks.push({
        id: uuid(), category: 'fundamentals', title: 'Fundamentals',
        description: 'Scales, long tones, and basic technical work',
        planned_duration_min: minutes.fundamentals, sort_order: order++, status: 'pending',
      });
    }
  }

  // 3. Technique
  if (minutes.technique > 0) {
    const techExercises = await queryAll(`
      SELECT DISTINCT ON (e.id) e.*, td.description as demand_desc, p.title as piece_title, tc.name as category_name
      FROM exercises e
      JOIN demand_exercises de ON e.id = de.exercise_id
      JOIN technical_demands td ON de.demand_id = td.id
      JOIN pieces p ON td.piece_id = p.id
      LEFT JOIN taxonomy_categories tc ON e.category_id = tc.id
      WHERE p.status = 'in_progress'
      ORDER BY e.id, p.priority DESC, td.difficulty DESC
      LIMIT 4
    `);

    if (techExercises.length > 0) {
      const perEx = Math.round(minutes.technique / techExercises.length);
      for (const ex of techExercises) {
        blocks.push({
          id: uuid(), category: 'technique', title: ex.title,
          description: `For: ${ex.piece_title} — ${ex.demand_desc}`,
          planned_duration_min: perEx, sort_order: order++, status: 'pending',
          linked_type: 'exercise', linked_id: ex.id, focus_points: ex.demand_desc,
        });
      }
    } else {
      blocks.push({
        id: uuid(), category: 'technique', title: 'Technique work',
        description: 'Link exercises to piece demands to get targeted blocks here',
        planned_duration_min: minutes.technique, sort_order: order++, status: 'pending',
      });
    }
  }

  // 4. Repertoire
  if (minutes.repertoire > 0) {
    const sections = await queryAll(`
      SELECT s.*, p.title as piece_title, p.priority, p.target_date,
        CASE s.status
          WHEN 'not_started' THEN 4
          WHEN 'working_on' THEN 3
          WHEN 'solid' THEN 2
          WHEN 'polished' THEN 1
        END as status_priority
      FROM sections s
      JOIN pieces p ON s.piece_id = p.id
      WHERE p.status = 'in_progress'
      ORDER BY
        CASE p.priority WHEN 'high' THEN 3 WHEN 'medium' THEN 2 WHEN 'low' THEN 1 END DESC,
        p.target_date ASC NULLS LAST,
        status_priority DESC,
        s.sort_order ASC
      LIMIT 4
    `);

    if (sections.length > 0) {
      const perSection = Math.round(minutes.repertoire / sections.length);
      for (const s of sections) {
        blocks.push({
          id: uuid(), category: 'repertoire', title: `${s.piece_title} — ${s.name}`,
          description: s.bar_range ? `Bars ${s.bar_range}` : 'Full section',
          planned_duration_min: perSection, sort_order: order++, status: 'pending',
          linked_type: 'section', linked_id: s.id, focus_points: s.notes || '',
        });
      }
    } else {
      blocks.push({
        id: uuid(), category: 'repertoire', title: 'Repertoire practice',
        description: 'Add pieces with sections to get targeted blocks here',
        planned_duration_min: minutes.repertoire, sort_order: order++, status: 'pending',
      });
    }
  }

  // 5. Excerpts
  if (minutes.excerpts > 0) {
    const today = new Date().toISOString().slice(0, 10);
    const rotation = await queryAll(
      'SELECT rl.*, e.title, e.composer, e.location_in_score, e.performance_notes FROM excerpt_rotation_log rl JOIN excerpts e ON rl.excerpt_id = e.id WHERE rl.date = $1',
      [today]
    );

    if (rotation.length > 0) {
      const perExcerpt = Math.round(minutes.excerpts / rotation.length);
      for (const r of rotation) {
        blocks.push({
          id: uuid(), category: 'excerpts', title: r.title,
          description: `${r.composer}${r.location_in_score ? ' — ' + r.location_in_score : ''}`,
          planned_duration_min: perExcerpt, sort_order: order++, status: 'pending',
          linked_type: 'excerpt', linked_id: r.excerpt_id, focus_points: r.performance_notes || '',
        });
      }
    } else {
      blocks.push({
        id: uuid(), category: 'excerpts', title: 'Orchestral excerpts',
        description: 'Add excerpts to enable daily rotation',
        planned_duration_min: minutes.excerpts, sort_order: order++, status: 'pending',
      });
    }
  }

  // 6. Buffer
  if (minutes.buffer > 0) {
    blocks.push({
      id: uuid(), category: 'buffer', title: 'Buffer / Sight-reading',
      description: 'Overflow time, sight-reading, or revisit anything from the session',
      planned_duration_min: minutes.buffer, sort_order: order++, status: 'pending',
    });
  }

  // Save session
  const sessionId = uuid();
  const today = new Date().toISOString().slice(0, 10);
  await execute(
    'INSERT INTO practice_sessions (id, date, planned_duration_min, status, time_allocation) VALUES ($1, $2, $3, $4, $5)',
    [sessionId, today, duration_min, 'planned', JSON.stringify(alloc)]
  );

  for (const block of blocks) {
    await execute(
      'INSERT INTO session_blocks (id, session_id, category, title, description, planned_duration_min, sort_order, status, linked_type, linked_id, focus_points) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
      [block.id, sessionId, block.category, block.title, block.description, block.planned_duration_min, block.sort_order, block.status, block.linked_type || null, block.linked_id || null, block.focus_points || '']
    );
  }

  const session = await queryOne('SELECT * FROM practice_sessions WHERE id = $1', [sessionId]);
  session.blocks = await queryAll('SELECT * FROM session_blocks WHERE session_id = $1 ORDER BY sort_order', [sessionId]);
  res.status(201).json(session);
});

// GET current/latest session
router.get('/current', async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const session = await queryOne(
    "SELECT * FROM practice_sessions WHERE date = $1 AND status IN ('planned','in_progress') ORDER BY created_at DESC LIMIT 1",
    [today]
  );
  if (!session) return res.json(null);
  session.blocks = await queryAll('SELECT * FROM session_blocks WHERE session_id = $1 ORDER BY sort_order', [session.id]);
  res.json(session);
});

// GET all sessions (history)
router.get('/', async (req, res) => {
  const sessions = await queryAll('SELECT * FROM practice_sessions ORDER BY date DESC, created_at DESC LIMIT 50');
  for (const s of sessions) {
    s.blocks = await queryAll('SELECT * FROM session_blocks WHERE session_id = $1 ORDER BY sort_order', [s.id]);
  }
  res.json(sessions);
});

// PUT start session
router.put('/:id/start', async (req, res) => {
  const session = await queryOne('SELECT * FROM practice_sessions WHERE id = $1', [req.params.id]);
  if (!session) return res.status(404).json({ error: 'Not found' });
  await execute("UPDATE practice_sessions SET status = 'in_progress', updated_at = NOW() WHERE id = $1", [req.params.id]);
  const firstBlock = await queryOne("SELECT id FROM session_blocks WHERE session_id = $1 AND status = 'pending' ORDER BY sort_order LIMIT 1", [req.params.id]);
  if (firstBlock) {
    await execute("UPDATE session_blocks SET status = 'active' WHERE id = $1", [firstBlock.id]);
  }
  const updated = await queryOne('SELECT * FROM practice_sessions WHERE id = $1', [req.params.id]);
  updated.blocks = await queryAll('SELECT * FROM session_blocks WHERE session_id = $1 ORDER BY sort_order', [req.params.id]);
  res.json(updated);
});

// PUT complete a block
router.put('/:sessionId/blocks/:blockId/complete', async (req, res) => {
  const { sessionId, blockId } = req.params;
  const { actual_duration_min, notes } = req.body;
  await execute(
    "UPDATE session_blocks SET status = 'completed', actual_duration_min = $1, notes = $2, completed_at = NOW() WHERE id = $3 AND session_id = $4",
    [actual_duration_min || null, notes || '', blockId, sessionId]
  );

  const nextBlock = await queryOne(
    "SELECT id FROM session_blocks WHERE session_id = $1 AND status = 'pending' ORDER BY sort_order LIMIT 1",
    [sessionId]
  );
  if (nextBlock) {
    await execute("UPDATE session_blocks SET status = 'active' WHERE id = $1", [nextBlock.id]);
  }

  const session = await queryOne('SELECT * FROM practice_sessions WHERE id = $1', [sessionId]);
  session.blocks = await queryAll('SELECT * FROM session_blocks WHERE session_id = $1 ORDER BY sort_order', [sessionId]);
  res.json(session);
});

// PUT skip a block
router.put('/:sessionId/blocks/:blockId/skip', async (req, res) => {
  const { sessionId, blockId } = req.params;
  await execute(
    "UPDATE session_blocks SET status = 'skipped' WHERE id = $1 AND session_id = $2",
    [blockId, sessionId]
  );

  const nextBlock = await queryOne(
    "SELECT id FROM session_blocks WHERE session_id = $1 AND status = 'pending' ORDER BY sort_order LIMIT 1",
    [sessionId]
  );
  if (nextBlock) {
    await execute("UPDATE session_blocks SET status = 'active' WHERE id = $1", [nextBlock.id]);
  }

  const session = await queryOne('SELECT * FROM practice_sessions WHERE id = $1', [sessionId]);
  session.blocks = await queryAll('SELECT * FROM session_blocks WHERE session_id = $1 ORDER BY sort_order', [sessionId]);
  res.json(session);
});

// PUT complete session
router.put('/:id/complete', async (req, res) => {
  const { rating, notes } = req.body;
  const session = await queryOne('SELECT * FROM practice_sessions WHERE id = $1', [req.params.id]);
  if (!session) return res.status(404).json({ error: 'Not found' });

  const blocks = await queryAll('SELECT * FROM session_blocks WHERE session_id = $1', [req.params.id]);
  const actualMin = blocks.reduce((sum, b) => sum + (b.actual_duration_min || b.planned_duration_min), 0);

  await execute(
    "UPDATE practice_sessions SET status = 'completed', actual_duration_min = $1, rating = $2, notes = $3, updated_at = NOW() WHERE id = $4",
    [actualMin, rating || null, notes || '', req.params.id]
  );

  const updated = await queryOne('SELECT * FROM practice_sessions WHERE id = $1', [req.params.id]);
  updated.blocks = await queryAll('SELECT * FROM session_blocks WHERE session_id = $1 ORDER BY sort_order', [req.params.id]);
  res.json(updated);
});

// GET stats (for dashboard)
router.get('/stats', async (req, res) => {
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const weekSessions = await queryAll(
    "SELECT * FROM practice_sessions WHERE date >= $1 AND status = 'completed'",
    [weekAgo]
  );

  const totalMinutes = weekSessions.reduce((sum, s) => sum + (s.actual_duration_min || s.planned_duration_min || 0), 0);
  const sessionCount = weekSessions.length;

  // Streak
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today - i * 86400000).toISOString().slice(0, 10);
    const has = await queryOne("SELECT id FROM practice_sessions WHERE date = $1 AND status = 'completed' LIMIT 1", [d]);
    if (has) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  res.json({
    weekMinutes: totalMinutes,
    weekHours: +(totalMinutes / 60).toFixed(1),
    weekSessions: sessionCount,
    streak,
  });
});

export default router;
