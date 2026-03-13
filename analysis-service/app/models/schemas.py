from pydantic import BaseModel, Field


class OmrResponse(BaseModel):
    musicxml_content: str | None = None
    confidence: float | None = None
    page_count: int | None = None
    measure_count: int | None = None
    extracted_title: str | None = None
    extracted_composer: str | None = None
    error: str | None = None
    success: bool = False


class AnalysisRequest(BaseModel):
    musicxml_content: str


class ScalePattern(BaseModel):
    scale_type: str  # major, minor, chromatic, etc
    key: str
    bar_range: str
    confidence: float


class ArpeggioPattern(BaseModel):
    chord_type: str  # major, minor, diminished, etc
    key: str
    bar_range: str
    confidence: float


class IntervalAnalysis(BaseModel):
    largest: str
    most_common: str
    distribution: dict[str, int]


class RhythmAnalysis(BaseModel):
    complexity_score: float = Field(ge=1, le=10)
    time_changes: list[dict]
    has_syncopation: bool
    shortest_duration: str
    longest_duration: str


class DynamicMarking(BaseModel):
    marking: str
    measure: int


class TempoMarking(BaseModel):
    text: str
    bpm: int | None = None
    measure: int


class ArticulationInfo(BaseModel):
    type: str
    count: int


class StructureInfo(BaseModel):
    form: str | None = None
    sections: list[dict]
    has_repeats: bool
    total_measures: int


class RegisterAnalysis(BaseModel):
    lowest_note: str
    highest_note: str
    range_semitones: int
    register_changes: int


class MusicPattern(BaseModel):
    pattern_type: str  # motif, sequence, ostinato
    description: str
    bar_range: str
    occurrences: int


class AnalysisResponse(BaseModel):
    key_signature: str | None = None
    time_signature: str | None = None
    tempo_marking: str | None = None
    difficulty_estimate: int | None = None
    register_low: str | None = None
    register_high: str | None = None
    total_measures: int | None = None
    scales: list[ScalePattern] = []
    arpeggios: list[ArpeggioPattern] = []
    intervals: IntervalAnalysis | None = None
    rhythm: RhythmAnalysis | None = None
    dynamics: list[DynamicMarking] = []
    tempo_markings: list[TempoMarking] = []
    articulations: list[ArticulationInfo] = []
    structure: StructureInfo | None = None
    register: RegisterAnalysis | None = None
    patterns: list[MusicPattern] = []
    demands: list[dict] = []
    success: bool = False
    error: str | None = None


class ClaudeEnhanceRequest(BaseModel):
    musicxml_content: str
    basic_analysis: dict


class FluteAnalysis(BaseModel):
    breathing_points: list[dict] = []  # {measure, beat, suggestion}
    alternate_fingerings: list[dict] = []  # {note, measure, fingering}
    tone_color_notes: list[str] = []
    technique_warnings: list[dict] = []  # {description, measure, suggestion}
    practice_suggestions: list[str] = []


class ClaudeEnhanceResponse(BaseModel):
    flute_analysis: FluteAnalysis | None = None
    estimated_tokens: int = 0
    estimated_cost_usd: float = 0.0
    success: bool = False
    error: str | None = None


class CostEstimateResponse(BaseModel):
    estimated_input_tokens: int = 0
    estimated_output_tokens: int = 0
    estimated_cost_usd: float = 0.0
    description: str = ""
