import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp, generateToken, mockQuery } from '../setup.js';

let app, token;

beforeAll(async () => {
  app = await createApp('../routes/excerpts.js', '/api/excerpts');
  token = generateToken();
});

const EXCERPT = { id: 'exc-1', title: 'Brahms 4 Mvt 4', composer: 'Brahms', status: 'needs_work' };

describe('Excerpts Routes', () => {
  describe('GET /api/excerpts', () => {
    it('should return all excerpts', async () => {
      mockQuery('SELECT * FROM excerpts', [EXCERPT]);
      const res = await request(app).get('/api/excerpts').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/excerpts');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/excerpts/:id', () => {
    it('should return a single excerpt', async () => {
      mockQuery('SELECT * FROM excerpts WHERE id', EXCERPT);
      const res = await request(app).get('/api/excerpts/exc-1').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Brahms 4 Mvt 4');
    });

    it('should return 404 for missing excerpt', async () => {
      const res = await request(app).get('/api/excerpts/nope').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/excerpts', () => {
    it('should create an excerpt', async () => {
      mockQuery('INSERT INTO excerpts', []);
      mockQuery('SELECT * FROM excerpts WHERE id', { ...EXCERPT, id: 'test-uuid-1' });

      const res = await request(app)
        .post('/api/excerpts')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Brahms 4 Mvt 4' });

      expect(res.status).toBe(201);
    });

    it('should return 400 without title', async () => {
      const res = await request(app)
        .post('/api/excerpts')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/excerpts/:id', () => {
    it('should update an excerpt', async () => {
      mockQuery('SELECT * FROM excerpts WHERE id', EXCERPT);
      mockQuery('UPDATE excerpts', []);
      mockQuery('SELECT * FROM excerpts WHERE id', { ...EXCERPT, title: 'Updated' });

      const res = await request(app)
        .put('/api/excerpts/exc-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated' });

      expect(res.status).toBe(200);
    });

    it('should return 404 for missing excerpt', async () => {
      const res = await request(app)
        .put('/api/excerpts/nope')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'X' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/excerpts/:id', () => {
    it('should delete an excerpt', async () => {
      mockQuery('SELECT id FROM excerpts WHERE id', { id: 'exc-1' });
      mockQuery('DELETE FROM session_blocks', []);
      mockQuery('DELETE FROM uploaded_files', []);
      mockQuery('DELETE FROM excerpts', []);

      const res = await request(app).delete('/api/excerpts/exc-1').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
    });

    it('should return 404 for missing excerpt', async () => {
      const res = await request(app).delete('/api/excerpts/nope').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });
});
