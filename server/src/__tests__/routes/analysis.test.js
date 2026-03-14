import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp, generateToken, mockQuery } from '../setup.js';

let app, token;

beforeAll(async () => {
  app = await createApp('../routes/analysis.js', '/api/analysis');
  token = generateToken();
});

const FILE = { id: 'file-1', file_type: 'sheet_music_digital', file_path: 'scores/test.xml' };
const OMR = { id: 'omr-1', file_id: 'file-1', musicxml_path: 'scores/test.xml', confidence: 0.95 };
const ANALYSIS = { id: 'an-1', file_id: 'file-1', analysis_type: 'full', analysis_data: '{}' };

describe('Analysis Routes', () => {
  describe('POST /api/analysis/trigger-omr/:fileId', () => {
    it('should trigger OMR processing', async () => {
      mockQuery('SELECT * FROM uploaded_files WHERE id', FILE);
      mockQuery('UPDATE uploaded_files SET processing_status', []);
      mockQuery('INSERT INTO omr_results', []);
      mockQuery('SELECT * FROM omr_results WHERE id', OMR);

      const res = await request(app)
        .post('/api/analysis/trigger-omr/file-1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('should return 404 for missing file', async () => {
      const res = await request(app)
        .post('/api/analysis/trigger-omr/nope')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/analysis/trigger-analysis/:fileId', () => {
    it('should trigger analysis for digital sheet music', async () => {
      mockQuery('SELECT * FROM uploaded_files WHERE id', FILE);
      mockQuery('INSERT INTO analysis_results', []);
      mockQuery('SELECT * FROM analysis_results WHERE id', ANALYSIS);
      mockQuery('SELECT * FROM analysis_demands WHERE analysis_id', []);

      const res = await request(app)
        .post('/api/analysis/trigger-analysis/file-1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('should return 404 for missing file', async () => {
      const res = await request(app)
        .post('/api/analysis/trigger-analysis/nope')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/analysis/trigger-claude/:analysisId', () => {
    it('should return cost estimate when not confirmed', async () => {
      mockQuery('SELECT * FROM analysis_results WHERE id', { ...ANALYSIS, file_id: 'file-1' });
      mockQuery('SELECT * FROM uploaded_files WHERE id', FILE);

      const res = await request(app)
        .post('/api/analysis/trigger-claude/an-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ confirmed: false });

      expect(res.status).toBe(200);
      expect(res.body.requires_confirmation).toBe(true);
    });

    it('should return 404 for missing analysis', async () => {
      const res = await request(app)
        .post('/api/analysis/trigger-claude/nope')
        .set('Authorization', `Bearer ${token}`)
        .send({ confirmed: true });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/analysis/omr/:fileId', () => {
    it('should return OMR result', async () => {
      mockQuery('SELECT * FROM omr_results WHERE file_id', OMR);
      const res = await request(app).get('/api/analysis/omr/file-1').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.confidence).toBe(0.95);
    });

    it('should return 404 when no OMR result', async () => {
      const res = await request(app).get('/api/analysis/omr/nope').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/analysis/results/:fileId', () => {
    it('should return analysis result', async () => {
      mockQuery('SELECT * FROM analysis_results WHERE file_id', ANALYSIS);
      const res = await request(app).get('/api/analysis/results/file-1').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('should return 404 when no analysis', async () => {
      const res = await request(app).get('/api/analysis/results/nope').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/analysis/demands/:analysisId', () => {
    it('should return demands for analysis', async () => {
      mockQuery('SELECT * FROM analysis_demands WHERE analysis_id', []);
      const res = await request(app).get('/api/analysis/demands/an-1').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('POST /api/analysis/demands/:demandId/import', () => {
    it('should import a demand', async () => {
      mockQuery('SELECT * FROM analysis_demands WHERE id', { id: 'd1', description: 'Trill', category_id: null, difficulty: 5, bar_range: '1-4' });
      mockQuery('INSERT INTO technical_demands', []);
      mockQuery('UPDATE analysis_demands', []);
      mockQuery('SELECT * FROM technical_demands WHERE id', { id: 'test-uuid-1', description: 'Trill' });

      const res = await request(app)
        .post('/api/analysis/demands/d1/import')
        .set('Authorization', `Bearer ${token}`)
        .send({ piece_id: 'piece-1' });

      expect(res.status).toBe(200);
    });

    it('should return 404 for missing demand', async () => {
      const res = await request(app)
        .post('/api/analysis/demands/nope/import')
        .set('Authorization', `Bearer ${token}`)
        .send({ piece_id: 'piece-1' });

      expect(res.status).toBe(404);
    });

    it('should return 400 without piece_id', async () => {
      mockQuery('SELECT * FROM analysis_demands WHERE id', { id: 'd1' });

      const res = await request(app)
        .post('/api/analysis/demands/d1/import')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/analysis/status/:fileId', () => {
    it('should return combined status', async () => {
      mockQuery('SELECT * FROM uploaded_files WHERE id', FILE);
      mockQuery('SELECT * FROM omr_results WHERE file_id', null);
      mockQuery('SELECT * FROM analysis_results WHERE file_id', null);

      const res = await request(app).get('/api/analysis/status/file-1').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.file).toBeTruthy();
      expect(res.body.omr).toBeNull();
    });

    it('should return 404 for missing file', async () => {
      const res = await request(app).get('/api/analysis/status/nope').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });
});
