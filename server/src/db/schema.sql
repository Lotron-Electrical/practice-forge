-- Practice Forge Database Schema (PostgreSQL)

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  user_id TEXT,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);

-- Users table (must be created before any table that references it)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  instrument TEXT NOT NULL DEFAULT 'Flute',
  level TEXT NOT NULL DEFAULT 'student' CHECK(level IN ('student','advanced_student','pre_professional','professional')),
  institution TEXT,
  bio TEXT,
  avatar_url TEXT,
  privacy_settings JSONB NOT NULL DEFAULT '{"profile_visible":false,"stats_visible":false,"recordings_shareable":false,"activity_visible":false}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

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
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_pieces_user_id ON pieces(user_id);

CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_sections_user_id ON sections(user_id);

CREATE TABLE IF NOT EXISTS technical_demands (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_technical_demands_user_id ON technical_demands(user_id);

CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_exercises_user_id ON exercises(user_id);

CREATE TABLE IF NOT EXISTS demand_exercises (
  demand_id TEXT NOT NULL REFERENCES technical_demands(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  PRIMARY KEY (demand_id, exercise_id)
);

CREATE TABLE IF NOT EXISTS excerpts (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_excerpts_user_id ON excerpts(user_id);

CREATE TABLE IF NOT EXISTS uploaded_files (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_id ON uploaded_files(user_id);

-- Phase 2: Session planner + logging + excerpt rotation

CREATE TABLE IF NOT EXISTS practice_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  planned_duration_min INTEGER NOT NULL,
  actual_duration_min INTEGER,
  status TEXT NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','in_progress','completed','abandoned')),
  rating TEXT CHECK(rating IN ('good','okay','bad') OR rating IS NULL),
  notes TEXT DEFAULT '',
  time_allocation TEXT DEFAULT '{}',
  started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_id ON practice_sessions(user_id);

CREATE TABLE IF NOT EXISTS session_blocks (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_session_blocks_user_id ON session_blocks(user_id);

CREATE TABLE IF NOT EXISTS excerpt_rotation_log (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  excerpt_id TEXT NOT NULL REFERENCES excerpts(id) ON DELETE CASCADE,
  practiced BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rotation_date ON excerpt_rotation_log(date);
CREATE INDEX IF NOT EXISTS idx_rotation_excerpt ON excerpt_rotation_log(excerpt_id);
CREATE INDEX IF NOT EXISTS idx_excerpt_rotation_log_user_id ON excerpt_rotation_log(user_id);

-- Phase 7: Sheet Music Intelligence Engine

CREATE TABLE IF NOT EXISTS omr_results (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_omr_results_user_id ON omr_results(user_id);

CREATE TABLE IF NOT EXISTS analysis_results (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_analysis_results_user_id ON analysis_results(user_id);

CREATE TABLE IF NOT EXISTS analysis_demands (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_analysis_demands_user_id ON analysis_demands(user_id);

-- Phase: Resource Finder

CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  linked_type TEXT NOT NULL CHECK(linked_type IN ('piece','excerpt')),
  linked_id TEXT NOT NULL,
  resource_type TEXT NOT NULL CHECK(resource_type IN ('score','recording','article','other')),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  source TEXT NOT NULL CHECK(source IN ('imslp','youtube','wikipedia','manual')),
  description TEXT DEFAULT '',
  thumbnail_url TEXT,
  attribution TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_resources_linked ON resources(linked_type, linked_id);
CREATE INDEX IF NOT EXISTS idx_resources_user_id ON resources(user_id);

-- Phase 10: Audio Listening & Feedback Engine

CREATE TABLE IF NOT EXISTS audio_recordings (
  id TEXT PRIMARY KEY,
  file_id TEXT REFERENCES uploaded_files(id) ON DELETE SET NULL,
  session_id TEXT REFERENCES practice_sessions(id) ON DELETE SET NULL,
  block_id TEXT,
  linked_type TEXT CHECK(linked_type IN ('piece','section','excerpt','exercise','freeform') OR linked_type IS NULL),
  linked_id TEXT,
  title TEXT NOT NULL DEFAULT '',
  duration_seconds REAL,
  target_bpm INTEGER,
  target_key TEXT,
  score_file_id TEXT,
  start_bar INTEGER,
  end_bar INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recordings_linked ON audio_recordings(linked_type, linked_id);
CREATE INDEX IF NOT EXISTS idx_recordings_session ON audio_recordings(session_id);

CREATE TABLE IF NOT EXISTS audio_analyses (
  id TEXT PRIMARY KEY,
  recording_id TEXT NOT NULL REFERENCES audio_recordings(id) ON DELETE CASCADE,
  pitch_accuracy_pct REAL,
  rhythm_accuracy_pct REAL,
  dynamic_range_db REAL,
  avg_rms REAL,
  avg_spectral_centroid REAL,
  avg_spectral_flatness REAL,
  pitch_stability REAL,
  overall_rating TEXT CHECK(overall_rating IN ('needs_work','acceptable','solid','excellent')),
  analysis_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audio_analysis_recording ON audio_analyses(recording_id);

-- Phase 13: Audits & Assessments

CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('piece_audit','excerpt_spot_check','technique_assessment','weekly_review')),
  piece_id TEXT REFERENCES pieces(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK(status IN ('in_progress','completed')),
  overall_score REAL,
  overall_rating TEXT CHECK(overall_rating IN ('needs_work','acceptable','solid','excellent') OR overall_rating IS NULL),
  results JSONB NOT NULL DEFAULT '{}',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_assessments_type ON assessments(type);
CREATE INDEX IF NOT EXISTS idx_assessments_piece ON assessments(piece_id);

CREATE TABLE IF NOT EXISTS assessment_recordings (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  recording_id TEXT REFERENCES audio_recordings(id) ON DELETE SET NULL,
  target_type TEXT NOT NULL CHECK(target_type IN ('piece','section','excerpt','exercise')),
  target_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  score REAL,
  bar_results JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_assessment_recordings ON assessment_recordings(assessment_id);

-- Phase 17: Community & Challenges

CREATE TABLE IF NOT EXISTS follows (
  follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

CREATE TABLE IF NOT EXISTS challenges (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('excerpt_duel','scale_sprint','sight_reading','practice_marathon','technique_showdown','weekly')),
  creator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_type TEXT CHECK(content_type IN ('excerpt','scale','exercise','passage','freeform')),
  content_id TEXT,
  description TEXT NOT NULL DEFAULT '',
  notation_data TEXT,
  deadline TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','completed','expired','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_challenges_creator ON challenges(creator_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(status);

CREATE TABLE IF NOT EXISTS challenge_participants (
  id TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'invited' CHECK(status IN ('invited','accepted','declined','submitted')),
  recording_id TEXT REFERENCES audio_recordings(id) ON DELETE SET NULL,
  score REAL,
  rank INTEGER,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge ON challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_user ON challenge_participants(user_id);

CREATE TABLE IF NOT EXISTS feed_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK(event_type IN ('challenge_result','achievement','milestone','shared_recording','weekly_leaderboard')),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_feed_events_user ON feed_events(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_events_created ON feed_events(created_at DESC);

CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, achievement_key)
);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id);

-- Phase 18: Community Excerpt Library + Theme Gallery

CREATE TABLE IF NOT EXISTS community_themes (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  base_theme TEXT DEFAULT 'light',
  tokens JSONB NOT NULL,
  tags TEXT DEFAULT '[]',
  favorites_count INTEGER DEFAULT 0,
  downloads_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_community_themes_creator ON community_themes(creator_id);

CREATE TABLE IF NOT EXISTS theme_favorites (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  theme_id TEXT NOT NULL REFERENCES community_themes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, theme_id)
);

CREATE TABLE IF NOT EXISTS excerpt_community_ratings (
  id TEXT PRIMARY KEY,
  excerpt_id TEXT NOT NULL REFERENCES excerpts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  difficulty_rating INTEGER CHECK(difficulty_rating BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(excerpt_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_excerpt_ratings_excerpt ON excerpt_community_ratings(excerpt_id);

CREATE TABLE IF NOT EXISTS excerpt_community_notes (
  id TEXT PRIMARY KEY,
  excerpt_id TEXT NOT NULL REFERENCES excerpts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  upvotes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_excerpt_notes_excerpt ON excerpt_community_notes(excerpt_id);

-- Session Templates
CREATE TABLE IF NOT EXISTS session_templates (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  planned_duration_min INTEGER NOT NULL,
  blocks JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_session_templates_user ON session_templates(user_id);

-- Phase 19: Subscriptions & Billing

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  tier TEXT NOT NULL DEFAULT 'free' CHECK(tier IN ('free','solo','pro','teacher')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','past_due','cancelled','trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);

CREATE TABLE IF NOT EXISTS ai_usage (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  generation_type TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON ai_usage(created_at);

-- Phase 20: Audition dates + history

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pieces' AND column_name = 'audition_date'
  ) THEN
    ALTER TABLE pieces ADD COLUMN audition_date TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'excerpts' AND column_name = 'audition_date'
  ) THEN
    ALTER TABLE excerpts ADD COLUMN audition_date TEXT;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS auditions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  audition_date TEXT NOT NULL,
  result TEXT CHECK(result IN ('won','callback','unsuccessful','pending','cancelled') OR result IS NULL),
  notes TEXT DEFAULT '',
  repertoire JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_auditions_date ON auditions(audition_date);

-- Phase 14: Analytics — add started_at to practice_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'practice_sessions' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE practice_sessions ADD COLUMN started_at TIMESTAMPTZ;
  END IF;
END $$;

-- Teacher Studio waitlist
CREATE TABLE IF NOT EXISTS waitlist (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'teacher',
  studio_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
