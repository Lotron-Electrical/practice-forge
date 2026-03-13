import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

import express from 'express';
import cors from 'cors';
import { initDatabase } from './db/connection.js';
import settingsRouter from './routes/settings.js';
import taxonomyRouter from './routes/taxonomy.js';
import piecesRouter from './routes/pieces.js';
import exercisesRouter from './routes/exercises.js';
import excerptsRouter from './routes/excerpts.js';
import sessionsRouter from './routes/sessions.js';
import filesRouter from './routes/files.js';
import analysisRouter from './routes/analysis.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/settings', settingsRouter);
app.use('/api/taxonomy', taxonomyRouter);
app.use('/api/pieces', piecesRouter);
app.use('/api/exercises', exercisesRouter);
app.use('/api/excerpts', excerptsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/files', filesRouter);
app.use('/api/analysis', analysisRouter);

// Serve uploaded data files
app.use('/data', express.static(path.resolve(__dirname, '..', '..', 'data')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve built React frontend in production
const clientDist = path.resolve(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  // Only serve index.html for non-API routes
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDist, 'index.html'));
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
