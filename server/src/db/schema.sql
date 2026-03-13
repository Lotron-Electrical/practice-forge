-- Practice Forge Database Schema (PostgreSQL)

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS taxonomy_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES taxonomy_categories(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_taxonomy_parent ON taxonomy_categories(parent_id);

CREATE TABLE IF NOT EXISTS pieces (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  composer TEXT NOT NULL DEFAULT '',
  difficulty INTEGER CHECK(difficulty BETWEEN 1 AND 10),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK(status IN ('not_started','in_progress','performance_ready','archived')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('high','medium','low')),
  target_date TEXT,
  colour_tag TEXT,
  general_notes TEXT DEFAULT '',
  historical_context TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY,
  piece_id TEXT NOT NULL REFERENCES pieces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK(status IN ('not_started','working_on','solid','polished')),
  bar_range TEXT,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sections_piece ON sections(piece_id);

CREATE TABLE IF NOT EXISTS technical_demands (
  id TEXT PRIMARY KEY,
  piece_id TEXT NOT NULL REFERENCES pieces(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category_id TEXT REFERENCES taxonomy_categories(id) ON DELETE SET NULL,
  difficulty INTEGER CHECK(difficulty BETWEEN 1 AND 10),
  bar_range TEXT,
  auto_detected BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demands_piece ON technical_demands(piece_id);
CREATE INDEX IF NOT EXISTS idx_demands_category ON technical_demands(category_id);

CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  source TEXT DEFAULT '',
  source_type TEXT NOT NULL DEFAULT 'manual' CHECK(source_type IN ('manual','book','teacher','generated_rule','generated_ai')),
  category_id TEXT REFERENCES taxonomy_categories(id) ON DELETE SET NULL,
  secondary_categories TEXT DEFAULT '[]',
  key TEXT,
  difficulty INTEGER CHECK(difficulty BETWEEN 1 AND 10),
  description TEXT DEFAULT '',
  tags TEXT DEFAULT '[]',
  times_used INTEGER NOT NULL DEFAULT 0,
  last_used TEXT,
  notation_data TEXT,
  notation_format TEXT DEFAULT 'none' CHECK(notation_format IN ('musicxml','abc','none')),
  generation_context TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category_id);

CREATE TABLE IF NOT EXISTS demand_exercises (
  demand_id TEXT NOT NULL REFERENCES technical_demands(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  PRIMARY KEY (demand_id, exercise_id)
);

CREATE TABLE IF NOT EXISTS excerpts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  composer TEXT NOT NULL DEFAULT '',
  full_work_title TEXT DEFAULT '',
  location_in_score TEXT DEFAULT '',
  recording_reference TEXT,
  historical_context TEXT DEFAULT '',
  performance_notes TEXT DEFAULT '',
  difficulty INTEGER CHECK(difficulty BETWEEN 1 AND 10),
  status TEXT NOT NULL DEFAULT 'needs_work' CHECK(status IN ('needs_work','acceptable','solid','audition_ready')),
  last_practiced TEXT,
  times_practiced INTEGER NOT NULL DEFAULT 0,
  tags TEXT DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS uploaded_files (
  id TEXT PRIMARY KEY,
  original_filename TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK(file_type IN ('sheet_music_digital','sheet_music_scanned','audio','video','document')),
  mime_type TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK(processing_status IN ('pending','processing','complete','failed','needs_review')),
  processing_output TEXT,
  linked_type TEXT CHECK(linked_type IN ('piece','section','excerpt','exercise','freeform') OR linked_type IS NULL),
  linked_id TEXT,
  tags TEXT DEFAULT '[]',
  notes TEXT DEFAULT ''
);

-- Phase 2: Session planner + logging + excerpt rotation

CREATE TABLE IF NOT EXISTS practice_sessions (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  planned_duration_min INTEGER NOT NULL,
  actual_duration_min INTEGER,
  status TEXT NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','in_progress','completed','abandoned')),
  rating TEXT CHECK(rating IN ('good','okay','bad') OR rating IS NULL),
  notes TEXT DEFAULT '',
  time_allocation TEXT DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS session_blocks (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK(category IN ('warmup','fundamentals','technique','repertoire','excerpts','buffer')),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  planned_duration_min INTEGER NOT NULL,
  actual_duration_min INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','completed','skipped')),
  linked_type TEXT CHECK(linked_type IN ('piece','section','excerpt','exercise') OR linked_type IS NULL),
  linked_id TEXT,
  focus_points TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_blocks_session ON session_blocks(session_id);

CREATE TABLE IF NOT EXISTS excerpt_rotation_log (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  excerpt_id TEXT NOT NULL REFERENCES excerpts(id) ON DELETE CASCADE,
  practiced BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rotation_date ON excerpt_rotation_log(date);
CREATE INDEX IF NOT EXISTS idx_rotation_excerpt ON excerpt_rotation_log(excerpt_id);

-- Phase 7: Sheet Music Intelligence Engine

CREATE TABLE IF NOT EXISTS omr_results (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
  musicxml_path TEXT,
  confidence REAL,
  page_count INTEGER,
  measure_count INTEGER,
  extracted_title TEXT,
  extracted_composer TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_omr_file ON omr_results(file_id);

CREATE TABLE IF NOT EXISTS analysis_results (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
  omr_result_id TEXT REFERENCES omr_results(id) ON DELETE SET NULL,
  analysis_type TEXT NOT NULL DEFAULT 'full',
  key_signature TEXT,
  time_signature TEXT,
  tempo_marking TEXT,
  difficulty_estimate INTEGER,
  register_low TEXT,
  register_high TEXT,
  total_measures INTEGER,
  analysis_data JSONB NOT NULL DEFAULT '{}',
  claude_analysis JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','complete','failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analysis_file ON analysis_results(file_id);

CREATE TABLE IF NOT EXISTS analysis_demands (
  id TEXT PRIMARY KEY,
  analysis_id TEXT NOT NULL REFERENCES analysis_results(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category_id TEXT REFERENCES taxonomy_categories(id) ON DELETE SET NULL,
  difficulty INTEGER,
  bar_range TEXT,
  confidence REAL,
  imported BOOLEAN NOT NULL DEFAULT FALSE,
  imported_demand_id TEXT REFERENCES technical_demands(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analysis_demands_analysis ON analysis_demands(analysis_id);
