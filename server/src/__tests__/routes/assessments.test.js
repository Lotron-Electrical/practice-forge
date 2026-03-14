import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp, generateToken, mockQuery } from '../setup.js';

let app, token;

beforeAll(async () => {
  app = await createApp('../routes/assessments.js', '/api/assessments');
  token = generateToken();
});

const ASSESSMENT = { id: 'as-1', type: 'piece_audit', status: 'pending', notes: '' };

describe('Assessments Routes', () => {
  describe('POST /api/assessments', () => {
    it('should create an assessment', async () => {
      mockQuery('INSERT INTO assessments', []);
      mockQuery('SELECT * FROM assessments WHERE id', { ...ASSESSMENT, id: 'test-uuid-1' });

      const res = await request(app)
        .post('/api/assessments')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'piece_audit' });

      expect(res.status).toBe(201);
    });

    it('should return 400 without type', async () => {
      const res = await request(app)
        .post('/api/assessments')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/api/assessments')
        .send({ type: 'piece_audit' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/assessments', () => {
    it('should return assessments list', async () => {
      mockQuery('SELECT * FROM assessments', [ASSESSMENT]);

      const res = await request(app).get('/api/assessments').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('should support filters', async () => {
      mockQuery('SELECT * FROM assessments', []);

      const res = await request(app)
        .get('/api/assessments?type=piece_audit&status=completed')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/assessments/:id', () => {
    it('should return assessment with recordings', async () => {
      mockQuery('SELECT * FROM assessments WHERE id', ASSESSMENT);
      mockQuery('SELECT ar.*, r.title', []);

      const res = await request(app).get('/api/assessments/as-1').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.assessment_recordings).toEqual([]);
    });

    it('should return 404 for missing assessment', async () => {
      const res = await request(app).get('/api/assessments/nope').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/assessments/:id', () => {
    it('should update an assessment', async () => {
      mockQuery('SELECT * FROM assessments WHERE id', ASSESSMENT);
      mockQuery('UPDATE assessments', []);
      mockQuery('SELECT * FROM assessments WHERE id', { ...ASSESSMENT, status: 'completed' });

      const res = await request(app)
        .put('/api/assessments/as-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'completed', overall_score: 85 });

      expect(res.status).toBe(200);
    });

    it('should return 404 for missing assessment', async () => {
      const res = await request(app)
        .put('/api/assessments/nope')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'completed' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/assessments/:id', () => {
    it('should delete an assessment', async () => {
      mockQuery('SELECT id FROM assessments WHERE id', { id: 'as-1' });
      mockQuery('DELETE FROM assessments', []);

      const res = await request(app).delete('/api/assessments/as-1').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
    });

    it('should return 404 for missing assessment', async () => {
      const res = await request(app).delete('/api/assessments/nope').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/assessments/:id/recordings', () => {
    it('should add a recording to an assessment', async () => {
      mockQuery('SELECT * FROM assessments WHERE id', ASSESSMENT);
      mockQuery('INSERT INTO assessment_recordings', []);
      mockQuery('SELECT * FROM assessment_recordings WHERE id', { id: 'test-uuid-1', target_type: 'excerpt', target_id: 'exc-1' });

      const res = await request(app)
        .post('/api/assessments/as-1/recordings')
        .set('Authorization', `Bearer ${token}`)
        .send({ target_type: 'excerpt', target_id: 'exc-1' });

      expect(res.status).toBe(201);
    });

    it('should return 400 without target_type and target_id', async () => {
      mockQuery('SELECT * FROM assessments WHERE id', ASSESSMENT);

      const res = await request(app)
        .post('/api/assessments/as-1/recordings')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 404 for missing assessment', async () => {
      const res = await request(app)
        .post('/api/assessments/nope/recordings')
        .set('Authorization', `Bearer ${token}`)
        .send({ target_type: 'excerpt', target_id: 'exc-1' });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/assessments/generate/spot-check', () => {
    it('should generate a spot-check assessment', async () => {
      mockQuery('SELECT * FROM excerpts ORDER BY RANDOM', [
        { id: 'e1', title: 'Ex 1', composer: 'C1', status: 'needs_work' },
      ]);
      mockQuery('INSERT INTO assessments', []);
      mockQuery('SELECT * FROM assessments WHERE id', { id: 'test-uuid-1', type: 'excerpt_spot_check' });

      const res = await request(app)
        .post('/api/assessments/generate/spot-check')
        .set('Authorization', `Bearer ${token}`)
        .send({ count: 3 });

      expect(res.status).toBe(201);
    });

    it('should return 400 when no excerpts exist', async () => {
      const res = await request(app)
        .post('/api/assessments/generate/spot-check')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/assessments/generate/weekly-review', () => {
    it('should generate a weekly review', async () => {
      mockQuery("SELECT * FROM practice_sessions WHERE date >=", []);
      mockQuery('SELECT title, status FROM pieces', []);
      mockQuery('SELECT s.name, s.status', []);
      mockQuery('SELECT r.*, a.pitch_accuracy', []);
      mockQuery('INSERT INTO assessments', []);
      mockQuery('SELECT * FROM assessments WHERE id', { id: 'test-uuid-1', type: 'weekly_review', status: 'completed' });

      const res = await request(app)
        .post('/api/assessments/generate/weekly-review')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(201);
    });
  });

  describe('GET /api/assessments/compare/:pieceId', () => {
    it('should return comparison data', async () => {
      mockQuery('SELECT id, overall_score', []);

      const res = await request(app)
        .get('/api/assessments/compare/piece-1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });
});
