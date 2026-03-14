import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp, generateToken, mockQuery } from '../setup.js';

let app, token;

beforeAll(async () => {
  app = await createApp('../routes/files.js', '/api/files');
  token = generateToken();
});

const FILE = { id: 'file-1', original_filename: 'score.xml', file_type: 'sheet_music_digital', file_path: 'scores/file-1.xml', processing_status: 'complete' };

describe('Files Routes', () => {
  describe('GET /api/files', () => {
    it('should return files list', async () => {
      mockQuery('SELECT * FROM uploaded_files', [FILE]);
      const res = await request(app).get('/api/files').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/files');
      expect(res.status).toBe(401);
    });

    it('should support filters', async () => {
      mockQuery('SELECT * FROM uploaded_files', []);
      const res = await request(app)
        .get('/api/files?file_type=audio&linked_type=piece')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/files/:id', () => {
    it('should return file metadata', async () => {
      mockQuery('SELECT * FROM uploaded_files WHERE id', FILE);
      const res = await request(app).get('/api/files/file-1').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.original_filename).toBe('score.xml');
    });

    it('should return 404 for missing file', async () => {
      const res = await request(app).get('/api/files/nope').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/files/:id', () => {
    it('should update file metadata', async () => {
      mockQuery('SELECT * FROM uploaded_files WHERE id', FILE);
      mockQuery('UPDATE uploaded_files', []);
      mockQuery('SELECT * FROM uploaded_files WHERE id', { ...FILE, notes: 'Updated' });

      const res = await request(app)
        .put('/api/files/file-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ notes: 'Updated' });

      expect(res.status).toBe(200);
    });

    it('should return 404 for missing file', async () => {
      const res = await request(app)
        .put('/api/files/nope')
        .set('Authorization', `Bearer ${token}`)
        .send({ notes: 'X' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/files/:id', () => {
    it('should delete file', async () => {
      mockQuery('SELECT * FROM uploaded_files WHERE id', FILE);
      mockQuery('DELETE FROM uploaded_files', []);

      const res = await request(app).delete('/api/files/file-1').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
    });

    it('should return 404 for missing file', async () => {
      const res = await request(app).delete('/api/files/nope').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/files/:id/link', () => {
    it('should link file to entity', async () => {
      mockQuery('SELECT * FROM uploaded_files WHERE id', FILE);
      mockQuery('UPDATE uploaded_files', []);
      mockQuery('SELECT * FROM uploaded_files WHERE id', { ...FILE, linked_type: 'piece', linked_id: 'p1' });

      const res = await request(app)
        .post('/api/files/file-1/link')
        .set('Authorization', `Bearer ${token}`)
        .send({ linked_type: 'piece', linked_id: 'p1' });

      expect(res.status).toBe(200);
    });

    it('should return 404 for missing file', async () => {
      const res = await request(app)
        .post('/api/files/nope/link')
        .set('Authorization', `Bearer ${token}`)
        .send({ linked_type: 'piece', linked_id: 'p1' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/files/:id/link', () => {
    it('should unlink file', async () => {
      mockQuery('SELECT * FROM uploaded_files WHERE id', FILE);
      mockQuery('UPDATE uploaded_files', []);
      mockQuery('SELECT * FROM uploaded_files WHERE id', { ...FILE, linked_type: null });

      const res = await request(app).delete('/api/files/file-1/link').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('should return 404 for missing file', async () => {
      const res = await request(app).delete('/api/files/nope/link').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/files/:id/musicxml', () => {
    it('should return 404 for missing file', async () => {
      const res = await request(app).get('/api/files/nope/musicxml').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });
});
