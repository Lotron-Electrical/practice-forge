import { Router } from 'express';
import { queryAll, queryOne, execute } from '../db/helpers.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { v4 as uuid } from 'uuid';

const router = Router();

// GET all categories (flat list — client builds tree)
router.get('/', asyncHandler(async (req, res) => {
  const rows = await queryAll('SELECT * FROM taxonomy_categories ORDER BY sort_order, name');
  res.json(rows);
}));

// GET single category
router.get('/:id', asyncHandler(async (req, res) => {
  const row = await queryOne('SELECT * FROM taxonomy_categories WHERE id = $1', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
}));

// POST create category
router.post('/', asyncHandler(async (req, res) => {
  const { name, parent_id = null, sort_order = 0, description = '' } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const id = uuid();
  await execute(
    'INSERT INTO taxonomy_categories (id, name, parent_id, sort_order, description) VALUES ($1, $2, $3, $4, $5)',
    [id, name, parent_id, sort_order, description]
  );
  const created = await queryOne('SELECT * FROM taxonomy_categories WHERE id = $1', [id]);
  res.status(201).json(created);
}));

// PUT update category
router.put('/:id', asyncHandler(async (req, res) => {
  const { name, parent_id, sort_order, description } = req.body;
  const existing = await queryOne('SELECT * FROM taxonomy_categories WHERE id = $1', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  await execute(
    'UPDATE taxonomy_categories SET name = $1, parent_id = $2, sort_order = $3, description = $4, updated_at = NOW() WHERE id = $5',
    [
      name ?? existing.name,
      parent_id !== undefined ? parent_id : existing.parent_id,
      sort_order ?? existing.sort_order,
      description ?? existing.description,
      req.params.id,
    ]
  );
  res.json(await queryOne('SELECT * FROM taxonomy_categories WHERE id = $1', [req.params.id]));
}));

// DELETE category
router.delete('/:id', asyncHandler(async (req, res) => {
  const existing = await queryOne('SELECT * FROM taxonomy_categories WHERE id = $1', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  await execute('DELETE FROM taxonomy_categories WHERE id = $1', [req.params.id]);
  res.json({ deleted: true });
}));

export default router;
