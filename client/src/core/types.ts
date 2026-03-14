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

// Resource Finder

export type ResourceType = 'score' | 'recording' | 'article' | 'other';
export type ResourceSource = 'imslp' | 'youtube' | 'wikipedia' | 'manual';
export type ResourceLinkedType = 'piece' | 'excerpt';

export interface Resource {
  id: string;
  linked_type: ResourceLinkedType;
  linked_id: string;
  resource_type: ResourceType;
  title: string;
  url: string;
  source: ResourceSource;
  description: string;
  thumbnail_url: string | null;
  attribution: string;
  created_at: string;
}

export interface ResourceSearchResult {
  title: string;
  url: string;
  source: ResourceSource;
  resource_type: ResourceType;
  description: string;
  thumbnail_url?: string | null;
}

export interface AutoDiscoverResults {
  imslp: ResourceSearchResult[];
  wikipedia: ResourceSearchResult[];
  youtube: ResourceSearchResult[];
}

// Phase 13: Audits & Assessments

export type AssessmentType = 'piece_audit' | 'excerpt_spot_check' | 'technique_assessment' | 'weekly_review';
export type AssessmentStatus = 'in_progress' | 'completed';

export interface Assessment {
  id: string;
  type: AssessmentType;
  piece_id: string | null;
  status: AssessmentStatus;
  overall_score: number | null;
  overall_rating: 'needs_work' | 'acceptable' | 'solid' | 'excellent' | null;
  results: Record<string, unknown>;
  notes: string;
  created_at: string;
  completed_at: string | null;
  assessment_recordings?: AssessmentRecording[];
}

export interface AssessmentRecording {
  id: string;
  assessment_id: string;
  recording_id: string | null;
  target_type: string;
  target_id: string;
  sort_order: number;
  score: number | null;
  bar_results: BarResult[] | null;
  recording_title?: string;
  duration_seconds?: number;
  file_id?: string;
  created_at: string;
}

export interface WeeklyReviewData {
  period: { from: string; to: string };
  sessions_completed: number;
  total_practice_minutes: number;
  total_practice_hours: number;
  category_breakdown: Record<string, number>;
  status_changes: { pieces: { title: string; status: string }[]; sections: { name: string; status: string; piece_title: string }[] };
  recordings_made: number;
  avg_pitch_accuracy: number | null;
}

// Phase 17: Community & Challenges

export type ChallengeType = 'excerpt_duel' | 'scale_sprint' | 'sight_reading' | 'practice_marathon' | 'technique_showdown' | 'weekly';
export type ChallengeStatus = 'pending' | 'active' | 'completed' | 'expired' | 'cancelled';
export type ParticipantStatus = 'invited' | 'accepted' | 'declined' | 'submitted';

export interface Challenge {
  id: string;
  type: ChallengeType;
  creator_id: string;
  content_type: string | null;
  content_id: string | null;
  description: string;
  notation_data: string | null;
  deadline: string;
  status: ChallengeStatus;
  participants: ChallengeParticipant[];
  created_at: string;
}

export interface ChallengeParticipant {
  id: string;
  challenge_id: string;
  user_id: string;
  status: ParticipantStatus;
  recording_id: string | null;
  score: number | null;
  rank: number | null;
  submitted_at: string | null;
  display_name?: string;
  instrument?: string;
}

export interface FeedEvent {
  id: string;
  user_id: string;
  event_type: string;
  title: string;
  description: string;
  data: Record<string, unknown>;
  display_name?: string;
  instrument?: string;
  created_at: string;
}

export interface Achievement {
  achievement_key: string;
  earned_at: string;
}

export interface PublicProfile {
  id: string;
  display_name: string;
  instrument: string;
  level: string;
  institution: string | null;
  bio: string | null;
  achievements: Achievement[];
}

// Phase 16: Authentication + User Profiles

export type UserLevel = 'student' | 'advanced_student' | 'pre_professional' | 'professional';

export interface User {
  id: string;
  email: string;
  display_name: string;
  instrument: string;
  level: UserLevel;
  institution: string | null;
  bio: string | null;
  avatar_url: string | null;
  privacy_settings: PrivacySettings;
  created_at: string;
  updated_at: string;
}

export interface PrivacySettings {
  profile_visible: boolean;
  stats_visible: boolean;
  recordings_shareable: boolean;
  activity_visible: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Phase 10: Audio Listening & Feedback Engine

export interface AudioRecording {
  id: string;
  file_id: string | null;
  session_id: string | null;
  block_id: string | null;
  linked_type: LinkedType | null;
  linked_id: string | null;
  title: string;
  duration_seconds: number | null;
  target_bpm: number | null;
  target_key: string | null;
  score_file_id: string | null;
  start_bar: number | null;
  end_bar: number | null;
  created_at: string;
  analysis?: AudioAnalysis | null;
  // Joined fields
  file_path?: string;
  original_filename?: string;
  pitch_accuracy_pct?: number | null;
  analysis_rating?: string | null;
}

export interface AudioAnalysis {
  id: string;
  recording_id: string;
  pitch_accuracy_pct: number | null;
  rhythm_accuracy_pct: number | null;
  dynamic_range_db: number | null;
  avg_rms: number | null;
  avg_spectral_centroid: number | null;
  avg_spectral_flatness: number | null;
  pitch_stability: number | null;
  overall_rating: 'needs_work' | 'acceptable' | 'solid' | 'excellent' | null;
  analysis_data: AudioAnalysisData;
  created_at: string;
}

export interface AudioAnalysisData {
  pitch_trace: PitchSample[];
  dynamics_envelope: DynamicsSample[];
  problem_spots: ProblemSpot[];
  bar_results?: BarResult[];
  note_events?: DetectedNote[];
}

export interface PitchSample {
  time: number;
  frequency: number;
  note: string;
  cents_deviation: number;
  clarity: number;
}

export interface DynamicsSample {
  time: number;
  rms: number;
  spectral_centroid: number;
  spectral_flatness: number;
}

export interface ProblemSpot {
  time_start: number;
  time_end: number;
  type: 'pitch' | 'rhythm' | 'dynamics';
  description: string;
  severity: 'minor' | 'moderate' | 'major';
  bar_number?: number;
}

export interface DetectedNote {
  time: number;
  frequency: number;
  note: string;
  duration: number;
  velocity: number;
}

export interface BarResult {
  bar_number: number;
  pitch_accuracy: number;
  rhythm_accuracy: number;
  status: 'accurate' | 'minor_issues' | 'inaccurate';
}

// Phase 12: Composition & Exercise Generation Engine

export type GenerationType = 'scale' | 'arpeggio' | 'interval' | 'articulation';
export type AiGenerationType = 'excerpt_prep' | 'warmup' | 'variation' | 'custom_study';

export interface GeneratedExercise {
  title: string;
  abc: string;
  description: string;
  key: string;
  difficulty: number;
  category_hint?: string;
  tags: string[];
  generation_method?: 'rule_based' | 'claude_api';
  prompt_used?: string;
  cost?: number;
}

export interface RuleGenerationParams {
  key?: string;
  scaleType?: string;
  chordType?: string;
  interval?: string;
  articulation?: string;
  octaves?: number;
  tempo?: number;
  pattern?: string;
}

export type HighlightMode = 'none' | 'scales' | 'arpeggios' | 'difficulty' | 'dynamics';

export interface AnalysisStatus {
  file: UploadedFile;
  omr: OmrResult | null;
  analysis: AnalysisResult | null;
}

// Phase 18: Community Excerpt Library + Theme Gallery

export interface CommunityTheme {
  id: string;
  creator_id: string;
  creator_name?: string;
  name: string;
  description: string;
  base_theme: string;
  tokens: Record<string, string>;
  tags: string[];
  favorites_count: number;
  downloads_count: number;
  is_favorited?: boolean;
  created_at: string;
}

export interface ExcerptCommunityData {
  avg_difficulty: number | null;
  rating_count: number;
  notes: CommunityNote[];
  user_rating?: number | null;
}

export interface CommunityNote {
  id: string;
  user_id: string;
  display_name: string;
  note: string;
  upvotes: number;
  created_at: string;
}

export const ACHIEVEMENT_DEFS: Record<string, { label: string; description: string; icon: string }> = {
  first_steps: { label: 'First Steps', description: 'Complete your first practice session', icon: 'music' },
  streak_7: { label: 'Week Warrior', description: '7-day practice streak', icon: 'flame' },
  streak_30: { label: 'Monthly Master', description: '30-day practice streak', icon: 'flame' },
  streak_100: { label: 'Century Streak', description: '100-day practice streak', icon: 'flame' },
  century: { label: 'Century', description: '100 hours total practice', icon: 'clock' },
  excerpt_explorer: { label: 'Excerpt Explorer', description: 'Practice 50 different excerpts', icon: 'map-pin' },
  challenge_champion: { label: 'Challenge Champion', description: 'Win 10 challenges', icon: 'trophy' },
  composers_friend: { label: "Composer's Friend", description: '50 AI-generated exercises', icon: 'sparkles' },
  community_contributor: { label: 'Community Contributor', description: 'Share 10 tips or recordings', icon: 'heart' },
  perfectionist: { label: 'Perfectionist', description: 'Score 95%+ on a piece audit', icon: 'diamond' },
  audition_ready: { label: 'Audition Ready', description: 'All excerpts solid or above', icon: 'star' },
};
