import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { initDatabase } from './db/connection.js';
import { requireAuth } from './middleware/auth.js';
import authRouter from './routes/auth.js';
import settingsRouter from './routes/settings.js';
import taxonomyRouter from './routes/taxonomy.js';
import piecesRouter from './routes/pieces.js';
import exercisesRouter from './routes/exercises.js';
import excerptsRouter from './routes/excerpts.js';
import sessionsRouter from './routes/sessions.js';
import filesRouter from './routes/files.js';
import analysisRouter from './routes/analysis.js';
import resourcesRouter from './routes/resources.js';
import recordingsRouter from './routes/recordings.js';
import compositionRouter from './routes/composition.js';
import assessmentsRouter from './routes/assessments.js';
import communityRouter from './routes/community.js';
import challengesRouter from './routes/challenges.js';
import themeGalleryRouter from './routes/themeGallery.js';
import communityExcerptsRouter from './routes/communityExcerpts.js';
import billingRouter from './routes/billing.js';
import auditionsRouter from './routes/auditions.js';

const app = express();
const PORT = process.env.PORT || 4000;

// CORS — restrict to known origins
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:4000').split(',');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(null, false);
  },
}));

// Stripe webhook needs raw body — must be before express.json()
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Global rate limit
app.use('/api', rateLimit({ windowMs: 60_000, max: 200, standardHeaders: true, legacyHeaders: false }));

// Stricter rate limit on AI endpoints
const aiLimiter = rateLimit({ windowMs: 3600_000, max: 30, message: { error: 'AI generation rate limit exceeded. Try again later.' } });
app.use('/api/composition/generate/ai', aiLimiter);
app.use('/api/composition/generate/excerpt-prep', aiLimiter);
app.use('/api/composition/generate/warmup', aiLimiter);
app.use('/api/analysis/trigger-claude', aiLimiter);

// Auth routes (public — no requireAuth)
app.use('/api/auth', authRouter);

// Billing routes — webhook is public (Stripe signature verification), rest requires auth
app.use('/api/billing', billingRouter);

// Protected API Routes — requireAuth skips in dev mode unless AUTH_REQUIRED=true
app.use('/api', requireAuth);
app.use('/api/settings', settingsRouter);
app.use('/api/taxonomy', taxonomyRouter);
app.use('/api/pieces', piecesRouter);
app.use('/api/exercises', exercisesRouter);
app.use('/api/excerpts', excerptsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/files', filesRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/resources', resourcesRouter);
app.use('/api/recordings', recordingsRouter);
app.use('/api/composition', compositionRouter);
app.use('/api/assessments', assessmentsRouter);
app.use('/api/community', communityRouter);
app.use('/api/challenges', challengesRouter);
app.use('/api/theme-gallery', themeGalleryRouter);
app.use('/api/community-excerpts', communityExcerptsRouter);
app.use('/api/auditions', auditionsRouter);

// Serve uploaded data files with security headers
const dataDir = path.resolve(__dirname, '..', '..', 'data');
app.use('/data', (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', 'inline');
  next();
}, express.static(dataDir));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve built React frontend in production
const clientDist = path.resolve(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Global error handler — catches unhandled async errors
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ error: 'Internal server error' });
});

// Initialize database then start server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Practice Forge server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
