import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp, generateToken, mockQuery } from '../setup.js';

let app, token;

beforeAll(async () => {
  app = await createApp('../routes/exercises.js', '/api/exercises');
  token = generateToken();
});

const EXERCISE = { id: 'ex-1', title: 'Scale', source: 'Manual', source_type: 'manual', category_name: 'Scales' };

describe('Exercises Routes', () => {
  describe('GET /api/exercises', () => {
    it('should return all exercises', async () => {
      mockQuery('SELECT e.*, tc.name', [EXERCISE]);

      const res = await request(app).get('/api/exercises').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/exercises');
      expect(res.status).toBe(401);
    });

    it('should support query filters', async () => {
      mockQuery('SELECT e.*, tc.name', [EXERCISE]);

      const res = await request(app)
        .get('/api/exercises?category_id=cat1&difficulty_min=3')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/exercises/:id', () => {
    it('should return exercise with linked demands', async () => {
      mockQuery('SELECT e.*, tc.name', EXERCISE);
      mockQuery('SELECT td.*, p.title', []);

      const res = await request(app).get('/api/exercises/ex-1').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.linked_demands).toEqual([]);
    });

    it('should return 404 for missing exercise', async () => {
      const res = await request(app).get('/api/exercises/nope').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/exercises', () => {
    it('should create an exercise', async () => {
      mockQuery('INSERT INTO exercises', []);
      mockQuery('SELECT * FROM exercises WHERE id', { ...EXERCISE, id: 'test-uuid-1' });

      const res = await request(app)
        .post('/api/exercises')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'New Scale' });

      expect(res.status).toBe(201);
    });

    it('should return 400 without title', async () => {
      const res = await request(app)
        .post('/api/exercises')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/exercises/:id', () => {
    it('should update an exercise', async () => {
      mockQuery('SELECT * FROM exercises WHERE id', EXERCISE);
      mockQuery('UPDATE exercises', []);
      mockQuery('SELECT * FROM exercises WHERE id', { ...EXERCISE, title: 'Updated' });

      const res = await request(app)
        .put('/api/exercises/ex-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated' });

      expect(res.status).toBe(200);
    });

    it('should return 404 for missing exercise', async () => {
      const res = await request(app)
        .put('/api/exercises/nope')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/exercises/:id', () => {
    it('should delete an exercise', async () => {
      mockQuery('SELECT id FROM exercises WHERE id', { id: 'ex-1' });
      mockQuery('DELETE FROM session_blocks', []);
      mockQuery('DELETE FROM exercises', []);

      const res = await request(app).delete('/api/exercises/ex-1').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
    });

    it('should return 404 for missing exercise', async () => {
      const res = await request(app).delete('/api/exercises/nope').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });
});
