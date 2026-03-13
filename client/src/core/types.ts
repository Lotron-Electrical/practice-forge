// Pure TypeScript models — no React imports

export type PieceStatus = 'not_started' | 'in_progress' | 'performance_ready' | 'archived';
export type Priority = 'high' | 'medium' | 'low';
export type SectionStatus = 'not_started' | 'working_on' | 'solid' | 'polished';
export type ExcerptStatus = 'needs_work' | 'acceptable' | 'solid' | 'audition_ready';
export type ExerciseSourceType = 'manual' | 'book' | 'teacher' | 'generated_rule' | 'generated_ai';

export interface TaxonomyCategory {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Piece {
  id: string;
  title: string;
  composer: string;
  difficulty: number | null;
  status: PieceStatus;
  priority: Priority;
  target_date: string | null;
  colour_tag: string | null;
  general_notes: string;
  historical_context: string | null;
  sections: Section[];
  technical_demands: TechnicalDemand[];
  created_at: string;
  updated_at: string;
}

export interface Section {
  id: string;
  piece_id: string;
  name: string;
  sort_order: number;
  status: SectionStatus;
  bar_range: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface TechnicalDemand {
  id: string;
  piece_id: string;
  description: string;
  category_id: string | null;
  category_name?: string;
  difficulty: number | null;
  bar_range: string | null;
  auto_detected: boolean;
  notes: string;
  linked_exercises: Exercise[];
  created_at: string;
  updated_at: string;
}

export interface Exercise {
  id: string;
  title: string;
  source: string;
  source_type: ExerciseSourceType;
  category_id: string | null;
  category_name?: string;
  secondary_categories: string[];
  key: string | null;
  difficulty: number | null;
  description: string;
  tags: string[];
  times_used: number;
  last_used: string | null;
  notation_data: string | null;
  notation_format: string;
  created_at: string;
  updated_at: string;
}

export interface Excerpt {
  id: string;
  title: string;
  composer: string;
  full_work_title: string;
  location_in_score: string;
  recording_reference: string | null;
  historical_context: string;
  performance_notes: string;
  difficulty: number | null;
  status: ExcerptStatus;
  last_practiced: string | null;
  times_practiced: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Settings {
  theme: string;
  fontSize: number;
  highContrast: boolean;
  colourVisionMode: string;
  reducedMotion: boolean;
  defaultSessionLength: number;
  excerptRotationCount: number;
  timeAllocation: {
    warmup: number;
    fundamentals: number;
    technique: number;
    repertoire: number;
    excerpts: number;
    buffer: number;
  };
}
