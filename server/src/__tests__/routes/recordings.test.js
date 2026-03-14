import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp, generateToken, mockQuery } from '../setup.js';

let app, token;

beforeAll(async () => {
  app = await createApp('../routes/recordings.js', '/api/recordings');
  token = generateToken();
});

const RECORDING = { id: 'rec-1', file_id: 'f1', title: 'Take 1', file_path: 'recordings/test.mp3', original_filename: 'test.mp3' };

describe('Recordings Routes', () => {
  describe('GET /api/recordings', () => {
    it('should return recordings list', async () => {
      mockQuery('SELECT r.*, f.file_path', [RECORDING]);
      const res = await request(app).get('/api/recordings').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/recordings');
      expect(res.status).toBe(401);
    });

    it('should support filters', async () => {
      mockQuery('SELECT r.*, f.file_path', []);
      const res = await request(app)
        .get('/api/recordings?linked_type=piece&linked_id=p1')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/recordings/:id', () => {
    it('should return recording with analysis', async () => {
      mockQuery('SELECT r.*, f.file_path', RECORDING);
      mockQuery('SELECT * FROM audio_analyses WHERE recording_id', null);

      const res = await request(app).get('/api/recordings/rec-1').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.analysis).toBeNull();
    });

    it('should return 404 for missing recording', async () => {
      const res = await request(app).get('/api/recordings/nope').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/recordings/:id', () => {
    it('should delete recording and linked file', async () => {
      mockQuery('SELECT * FROM audio_recordings WHERE id', { id: 'rec-1', file_id: 'f1' });
      mockQuery('SELECT * FROM uploaded_files WHERE id', { id: 'f1', file_path: 'recordings/test.mp3' });
      mockQuery('DELETE FROM uploaded_files', []);
      mockQuery('DELETE FROM audio_recordings', []);

      const res = await request(app).delete('/api/recordings/rec-1').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
    });

    it('should return 404 for missing recording', async () => {
      const res = await request(app).delete('/api/recordings/nope').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/recordings/:id/analysis', () => {
    it('should save analysis results', async () => {
      mockQuery('SELECT * FROM audio_recordings WHERE id', { id: 'rec-1' });
      mockQuery('DELETE FROM audio_analyses', []);
      mockQuery('INSERT INTO audio_analyses', []);
      mockQuery('SELECT * FROM audio_analyses WHERE id', { id: 'test-uuid-1', pitch_accuracy_pct: 92.5 });

      const res = await request(app)
        .post('/api/recordings/rec-1/analysis')
        .set('Authorization', `Bearer ${token}`)
        .send({ pitch_accuracy_pct: 92.5, overall_rating: 'good' });

      expect(res.status).toBe(201);
    });

    it('should return 404 for missing recording', async () => {
      const res = await request(app)
        .post('/api/recordings/nope/analysis')
        .set('Authorization', `Bearer ${token}`)
        .send({ pitch_accuracy_pct: 90 });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/recordings/:id/analysis', () => {
    it('should return analysis', async () => {
      mockQuery('SELECT * FROM audio_analyses WHERE recording_id', { id: 'a1', pitch_accuracy_pct: 92 });
      const res = await request(app).get('/api/recordings/rec-1/analysis').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('should return 404 when no analysis', async () => {
      const res = await request(app).get('/api/recordings/nope/analysis').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });
});
