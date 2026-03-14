/**
 * Test setup — mocks pg pool, Anthropic SDK, file system operations,
 * and provides helpers for creating the app and generating JWT tokens.
 */
import { vi } from 'vitest';
import jwt from 'jsonwebtoken';
import express from 'express';
import cookieParser from 'cookie-parser';

// ── JWT secret must match auth middleware default ──
const JWT_SECRET = 'practice-forge-dev-secret-change-in-production';

// ── Mock query results store ──
// Tests push { sql-pattern, params-pattern, result } into this array.
// The mock pool.query will match against them in order.
let queryResults = [];
let queryCallLog = [];

export function mockQuery(pattern, result) {
  queryResults.push({ pattern, result });
}

export function mockQueryOnce(pattern, result) {
  queryResults.push({ pattern, result, once: true });
}

export function resetMocks() {
  queryResults = [];
  queryCallLog = [];
}

export function getQueryLog() {
  return queryCallLog;
}

// Build a pg-compatible result from rows
function pgResult(rows) {
  if (!Array.isArray(rows)) rows = rows != null ? [rows] : [];
  return { rows, rowCount: rows.length };
}

// Mock pool.query
const mockPoolQuery = vi.fn(async (sql, params = []) => {
  queryCallLog.push({ sql, params });

  for (let i = 0; i < queryResults.length; i++) {
    const qr = queryResults[i];
    const pat = typeof qr.pattern === 'string' ? qr.pattern : qr.pattern.source || '';
    const matches = typeof qr.pattern === 'string'
      ? sql.includes(qr.pattern)
      : qr.pattern.test(sql);

    if (matches) {
      const result = typeof qr.result === 'function' ? qr.result(sql, params) : qr.result;
      if (qr.once) queryResults.splice(i, 1);
      return pgResult(result);
    }
  }

  // Default: return empty
  return pgResult([]);
});

// ── Mock the pg module ──
vi.mock('pg', () => {
  const Pool = vi.fn(() => ({
    query: mockPoolQuery,
    connect: vi.fn(async () => ({
      query: vi.fn(async () => ({ rows: [{ '?column?': 1 }] })),
      release: vi.fn(),
    })),
  }));
  return { default: { Pool }, Pool };
});

// ── Mock the db/connection module ──
vi.mock('../db/connection.js', () => ({
  initDatabase: vi.fn(async () => {}),
  getPool: vi.fn(() => ({
    query: mockPoolQuery,
  })),
}));

// ── Mock analysis utils ──
vi.mock('../utils/analysisClient.js', () => ({
  callOmr: vi.fn(async () => ({
    musicxml_content: '<xml/>',
    confidence: 0.95,
    page_count: 1,
    measure_count: 10,
    extracted_title: 'Test',
    extracted_composer: 'Composer',
  })),
  callAnalysis: vi.fn(async () => ({
    analysis_type: 'full',
    key_signature: 'C major',
    time_signature: '4/4',
    tempo_marking: 'Allegro',
    difficulty_estimate: 5,
    register_low: 'C4',
    register_high: 'C6',
    total_measures: 10,
    analysis_data: {},
    demands: [],
  })),
  callClaudeEnhance: vi.fn(async () => ({
    claude_analysis: { insights: 'test' },
    cost: 0.01,
  })),
  callEstimateCost: vi.fn(async () => ({
    estimated_cost: 0.02,
  })),
}));

// ── Mock AI generator ──
vi.mock('../utils/aiGenerator.js', () => ({
  generateWithAI: vi.fn(async () => ({
    title: 'Generated Exercise',
    abc: 'X:1\nK:C\nCDEF|',
    description: 'Test generated',
    cost: 0.01,
  })),
  estimateCost: vi.fn(() => ({
    estimated_cost: 0.02,
    model: 'claude-sonnet',
  })),
}));

// ── Mock rule generator ──
vi.mock('../utils/ruleGenerator.js', () => ({
  generateScale: vi.fn((params) => ({
    title: `${params.key || 'C'} Major Scale`,
    abc: 'X:1\nK:C\nCDEF|',
    description: 'Scale exercise',
  })),
  generateArpeggio: vi.fn((params) => ({
    title: `${params.key || 'C'} Arpeggio`,
    abc: 'X:1\nK:C\nCEG|',
    description: 'Arpeggio exercise',
  })),
  generateIntervalDrill: vi.fn(() => ({
    title: 'Interval Drill',
    abc: 'X:1\nK:C\nCE|',
    description: 'Interval drill',
  })),
  generateArticulationDrill: vi.fn(() => ({
    title: 'Articulation Drill',
    abc: 'X:1\nK:C\nCDEF|',
    description: 'Articulation drill',
  })),
  generateFromDemand: vi.fn(() => null), // returns null to test AI fallback
}));

// ── Mock upload middleware ──
vi.mock('../middleware/upload.js', () => ({
  upload: {
    single: vi.fn(() => (req, res, cb) => {
      // Simulate successful upload if req._mockFile is set
      if (req._mockFile) {
        req.file = req._mockFile;
      }
      cb(null);
    }),
  },
  detectFileType: vi.fn(() => 'sheet_music_digital'),
  initialProcessingStatus: vi.fn(() => 'complete'),
  moveToTypeDir: vi.fn((currentPath) => currentPath),
}));

// ── Mock pathSafe ──
vi.mock('../utils/pathSafe.js', () => ({
  safePath: vi.fn((p) => `/mock/data/${p}`),
  DATA_DIR: '/mock/data',
}));

// ── Mock fs for file routes ──
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn(() => true),
      readFileSync: vi.fn(() => '<xml>mock</xml>'),
      writeFileSync: vi.fn(),
      unlinkSync: vi.fn(),
      mkdirSync: vi.fn(),
    },
    existsSync: vi.fn(() => true),
    readFileSync: vi.fn(() => '<xml>mock</xml>'),
    writeFileSync: vi.fn(),
    unlinkSync: vi.fn(),
    mkdirSync: vi.fn(),
  };
});

// ── Mock bcrypt for speed ──
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(async (pw) => `hashed_${pw}`),
    compare: vi.fn(async (pw, hash) => hash === `hashed_${pw}`),
  },
}));

// ── Mock uuid to return predictable IDs ──
let uuidCounter = 0;
vi.mock('uuid', () => ({
  v4: vi.fn(() => `test-uuid-${++uuidCounter}`),
}));

// ── Helper: generate a valid JWT token ──
export function generateToken(user = {}) {
  const payload = {
    id: user.id || 'test-user-id',
    email: user.email || 'test@example.com',
    display_name: user.display_name || 'Test User',
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

// ── Helper: create an Express app with a specific router mounted ──
export async function createApp(routerPath, mountPath, options = {}) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // Import the auth middleware
  const { requireAuth } = await import('../middleware/auth.js');

  if (options.requireAuth !== false) {
    // Force AUTH_REQUIRED for tests
    process.env.AUTH_REQUIRED = 'true';
    app.use(mountPath, requireAuth);
  }

  const routerModule = await import(routerPath);
  app.use(mountPath, routerModule.default);

  // Error handler
  app.use((err, req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  });

  return app;
}

// Reset state before each test
beforeEach(() => {
  resetMocks();
  uuidCounter = 0;
  mockPoolQuery.mockClear();
});
