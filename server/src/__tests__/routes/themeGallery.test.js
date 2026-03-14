import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp, generateToken, mockQuery } from '../setup.js';

let app, token;

beforeAll(async () => {
  app = await createApp('../routes/themeGallery.js', '/api/theme-gallery');
  token = generateToken();
});

const THEME = { id: 'th-1', creator_id: 'test-user-id', name: 'Dark Pro', description: 'Dark theme', base_theme: 'dark', tokens: '{}', favorites_count: 0, downloads_count: 0 };

describe('Theme Gallery Routes', () => {
  describe('GET /api/theme-gallery', () => {
    it('should return community themes', async () => {
      mockQuery('SELECT ct.*, u.display_name', [{ ...THEME, creator_name: 'Test', is_favorited: false }]);

      const res = await request(app)
        .get('/api/theme-gallery')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/theme-gallery');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/theme-gallery/:id', () => {
    it('should return a single theme', async () => {
      mockQuery('SELECT ct.*, u.display_name', { ...THEME, creator_name: 'Test', is_favorited: false });

      const res = await request(app)
        .get('/api/theme-gallery/th-1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('should return 404 for missing theme', async () => {
      const res = await request(app)
        .get('/api/theme-gallery/nope')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/theme-gallery', () => {
    it('should create a theme', async () => {
      mockQuery('INSERT INTO community_themes', []);
      mockQuery('SELECT * FROM community_themes WHERE id', { ...THEME, id: 'test-uuid-1' });

      const res = await request(app)
        .post('/api/theme-gallery')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Dark Pro', tokens: { primary: '#000' } });

      expect(res.status).toBe(201);
    });

    it('should return 400 without name', async () => {
      const res = await request(app)
        .post('/api/theme-gallery')
        .set('Authorization', `Bearer ${token}`)
        .send({ tokens: { primary: '#000' } });

      expect(res.status).toBe(400);
    });

    it('should return 400 without tokens', async () => {
      const res = await request(app)
        .post('/api/theme-gallery')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Dark Pro' });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/theme-gallery/:id', () => {
    it('should update own theme', async () => {
      mockQuery('SELECT * FROM community_themes WHERE id', THEME);
      mockQuery('UPDATE community_themes', []);
      mockQuery('SELECT * FROM community_themes WHERE id', { ...THEME, name: 'Updated' });

      const res = await request(app)
        .put('/api/theme-gallery/th-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated' });

      expect(res.status).toBe(200);
    });

    it('should return 403 for non-owner', async () => {
      mockQuery('SELECT * FROM community_themes WHERE id', { ...THEME, creator_id: 'other-user' });

      const res = await request(app)
        .put('/api/theme-gallery/th-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated' });

      expect(res.status).toBe(403);
    });

    it('should return 404 for missing theme', async () => {
      const res = await request(app)
        .put('/api/theme-gallery/nope')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/theme-gallery/:id', () => {
    it('should delete own theme', async () => {
      mockQuery('SELECT * FROM community_themes WHERE id', THEME);
      mockQuery('DELETE FROM community_themes', []);

      const res = await request(app)
        .delete('/api/theme-gallery/th-1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
    });

    it('should return 403 for non-owner', async () => {
      mockQuery('SELECT * FROM community_themes WHERE id', { ...THEME, creator_id: 'other-user' });

      const res = await request(app)
        .delete('/api/theme-gallery/th-1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 for missing theme', async () => {
      const res = await request(app)
        .delete('/api/theme-gallery/nope')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/theme-gallery/:id/favorite', () => {
    it('should favorite a theme (toggle on)', async () => {
      mockQuery('SELECT id FROM community_themes WHERE id', { id: 'th-1' });
      mockQuery('SELECT user_id FROM theme_favorites', null);
      mockQuery('INSERT INTO theme_favorites', []);
      mockQuery('UPDATE community_themes SET favorites_count', []);

      const res = await request(app)
        .post('/api/theme-gallery/th-1/favorite')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.favorited).toBe(true);
    });

    it('should unfavorite a theme (toggle off)', async () => {
      mockQuery('SELECT id FROM community_themes WHERE id', { id: 'th-1' });
      mockQuery('SELECT user_id FROM theme_favorites', { user_id: 'test-user-id' });
      mockQuery('DELETE FROM theme_favorites', []);
      mockQuery('UPDATE community_themes SET favorites_count', []);

      const res = await request(app)
        .post('/api/theme-gallery/th-1/favorite')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.favorited).toBe(false);
    });

    it('should return 404 for missing theme', async () => {
      const res = await request(app)
        .post('/api/theme-gallery/nope/favorite')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/theme-gallery/:id/download', () => {
    it('should increment download count', async () => {
      mockQuery('UPDATE community_themes SET downloads_count', []);
      mockQuery('SELECT * FROM community_themes WHERE id', { ...THEME, downloads_count: 1 });

      const res = await request(app)
        .post('/api/theme-gallery/th-1/download')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('should return 404 for missing theme', async () => {
      mockQuery('UPDATE community_themes SET downloads_count', []);

      const res = await request(app)
        .post('/api/theme-gallery/nope/download')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });
});
