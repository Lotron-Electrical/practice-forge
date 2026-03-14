import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { mockQueryOnce, resetMocks } from '../setup.js';

const JWT_SECRET = 'practice-forge-dev-secret-change-in-production';

// Import router — setup.js has already mocked db/connection, bcrypt, uuid, etc.
const { default: authRouter } = await import('../../routes/auth.js');
const { requireAuth } = await import('../../middleware/auth.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRouter);
  app.use((err, req, res, _next) => {
    res.status(err.status || 500).json({ error: 'Internal server error' });
  });
  return app;
}

describe('auth routes', () => {
  let app;

  beforeEach(() => {
    process.env.AUTH_REQUIRED = 'true';
    app = createApp();
  });

  afterEach(() => {
    delete process.env.AUTH_REQUIRED;
  });

  describe('POST /api/auth/register', () => {
    it('registers a new user successfully', async () => {
      // First query: check existing user — none found
      mockQueryOnce('SELECT id FROM users WHERE email', null);
      // INSERT — the execute call
      mockQueryOnce('INSERT INTO users', []);
      // Second query: fetch newly created user
      mockQueryOnce('SELECT id, email, display_name', {
        id: 'test-uuid-1', email: 'new@test.com', display_name: 'new',
        instrument: 'Flute', level: 'student', created_at: '2025-01-01',
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'new@test.com', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe('new@test.com');
      expect(res.body.token).toBeDefined();
      const payload = jwt.verify(res.body.token, JWT_SECRET);
      expect(payload.email).toBe('new@test.com');
    });

    it('rejects duplicate email', async () => {
      mockQueryOnce('SELECT id FROM users WHERE email', { id: 'existing' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'dupe@test.com', password: 'password123' });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already exists/);
    });

    it('rejects missing email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/required/i);
    });

    it('rejects missing password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@test.com' });

      expect(res.status).toBe(400);
    });

    it('rejects short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@test.com', password: 'short' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/8 characters/);
    });

    it('rejects invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'not-an-email', password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/email/i);
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in with valid credentials', async () => {
      // bcrypt is mocked: hash('pw') => 'hashed_pw', compare('pw', 'hashed_pw') => true
      mockQueryOnce('SELECT * FROM users WHERE email', {
        id: 'u1', email: 'user@test.com', display_name: 'User',
        password_hash: 'hashed_password123', instrument: 'Flute', level: 'student',
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@test.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('user@test.com');
      expect(res.body.user.password_hash).toBeUndefined();
      expect(res.body.token).toBeDefined();
    });

    it('rejects wrong password', async () => {
      mockQueryOnce('SELECT * FROM users WHERE email', {
        id: 'u1', email: 'user@test.com',
        password_hash: 'hashed_correct-password',
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@test.com', password: 'wrong-password' });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid/i);
    });

    it('rejects non-existent user', async () => {
      mockQueryOnce('SELECT * FROM users WHERE email', null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@test.com', password: 'password123' });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid/i);
    });

    it('rejects missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns user profile with valid token', async () => {
      const token = jwt.sign(
        { id: 'u1', email: 'user@test.com', display_name: 'User' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      mockQueryOnce('SELECT id, email, display_name', {
        id: 'u1', email: 'user@test.com', display_name: 'User',
        instrument: 'Flute', level: 'student', created_at: '2025-01-01',
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('u1');
      expect(res.body.email).toBe('user@test.com');
    });

    it('rejects request without token', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/authentication/i);
    });

    it('rejects request with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });
  });
});
