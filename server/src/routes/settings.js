import { Router } from 'express';
import { queryAll, queryOne, execute } from '../db/helpers.js';

const router = Router();

// GET all settings
router.get('/', async (req, res) => {
  const rows = await queryAll('SELECT key, value FROM settings');
  const settings = {};
  for (const row of rows) {
    try { settings[row.key] = JSON.parse(row.value); }
    catch { settings[row.key] = row.value; }
  }
  res.json(settings);
});

// PUT update a setting
router.put('/:key', async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  const serialized = JSON.stringify(value);
  const existing = await queryOne('SELECT key FROM settings WHERE key = $1', [key]);
  if (existing) {
    await execute('UPDATE settings SET value = $1, updated_at = NOW() WHERE key = $2', [serialized, key]);
  } else {
    await execute('INSERT INTO settings (key, value) VALUES ($1, $2)', [key, serialized]);
  }
  res.json({ key, value });
});

export default router;
