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

export type FileType = 'sheet_music_digital' | 'sheet_music_scanned' | 'audio' | 'video' | 'document';
export type ProcessingStatus = 'pending' | 'processing' | 'complete' | 'failed' | 'needs_review';
export type LinkedType = 'piece' | 'section' | 'excerpt' | 'exercise' | 'freeform';

export interface UploadedFile {
  id: string;
  original_filename: string;
  file_type: FileType;
  mime_type: string;
  file_size_bytes: number;
  file_path: string;
  uploaded_at: string;
  processing_status: ProcessingStatus;
  processing_output: unknown;
  linked_type: LinkedType | null;
  linked_id: string | null;
  tags: string[];
  notes: string;
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

// Phase 7: Sheet Music Intelligence Engine

export interface OmrResult {
  id: string;
  file_id: string;
  musicxml_path: string | null;
  confidence: number | null;
  page_count: number | null;
  measure_count: number | null;
  extracted_title: string | null;
  extracted_composer: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScalePattern {
  scale_type: string;
  key: string;
  bar_range: string;
  confidence: number;
}

export interface ArpeggioPattern {
  chord_type: string;
  key: string;
  bar_range: string;
  confidence: number;
}

export interface IntervalAnalysis {
  largest: string;
  most_common: string;
  distribution: Record<string, number>;
}

export interface RhythmAnalysis {
  complexity_score: number;
  time_changes: Array<{ time_sig: string; measure: number }>;
  has_syncopation: boolean;
  shortest_duration: string;
  longest_duration: string;
}

export interface DynamicMarking {
  marking: string;
  measure: number;
}

export interface TempoMarking {
  text: string;
  bpm: number | null;
  measure: number;
}

export interface ArticulationInfo {
  type: string;
  count: number;
}

export interface StructureInfo {
  form: string | null;
  sections: Array<{ name: string; start_measure: number; end_measure: number }>;
  has_repeats: boolean;
  total_measures: number;
}

export interface RegisterAnalysis {
  lowest_note: string;
  highest_note: string;
  range_semitones: number;
  register_changes: number;
}

export interface MusicPattern {
  pattern_type: string;
  description: string;
  bar_range: string;
  occurrences: number;
}

export interface AnalysisData {
  scales: ScalePattern[];
  arpeggios: ArpeggioPattern[];
  intervals: IntervalAnalysis | null;
  rhythm: RhythmAnalysis | null;
  dynamics: DynamicMarking[];
  tempo_markings: TempoMarking[];
  articulations: ArticulationInfo[];
  structure: StructureInfo | null;
  register: RegisterAnalysis | null;
  patterns: MusicPattern[];
}

export interface FluteAnalysis {
  breathing_points: Array<{ measure: number; beat: number; suggestion: string }>;
  alternate_fingerings: Array<{ note: string; measure: number; fingering: string }>;
  tone_color_notes: string[];
  technique_warnings: Array<{ description: string; measure: number; suggestion: string }>;
  practice_suggestions: string[];
}

export interface AnalysisResult {
  id: string;
  file_id: string;
  omr_result_id: string | null;
  analysis_type: string;
  key_signature: string | null;
  time_signature: string | null;
  tempo_marking: string | null;
  difficulty_estimate: number | null;
  register_low: string | null;
  register_high: string | null;
  total_measures: number | null;
  analysis_data: AnalysisData;
  claude_analysis: FluteAnalysis | null;
  status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnalysisDemand {
  id: string;
  analysis_id: string;
  description: string;
  category_id: string | null;
  difficulty: number | null;
  bar_range: string | null;
  confidence: number | null;
  imported: boolean;
  imported_demand_id: string | null;
  created_at: string;
}

export type HighlightMode = 'none' | 'scales' | 'arpeggios' | 'difficulty' | 'dynamics';

export interface AnalysisStatus {
  file: UploadedFile;
  omr: OmrResult | null;
  analysis: AnalysisResult | null;
}
