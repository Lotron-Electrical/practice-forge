import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { api } from '../api/client';
import type { Assessment, Piece, WeeklyReviewData } from '../core/types';
import { ClipboardCheck, Music, ListMusic, BookOpen, Calendar, ChevronRight, Loader, TrendingUp } from 'lucide-react';

const TYPE_CONFIG: Record<string, { icon: typeof ClipboardCheck; label: string; color: string; description: string }> = {
  piece_audit: { icon: Music, label: 'Piece Audit', color: 'var(--pf-accent-gold)', description: 'Record a full play-through and get bar-by-bar accuracy results' },
  excerpt_spot_check: { icon: ListMusic, label: 'Excerpt Spot-Check', color: 'var(--pf-accent-lavender)', description: 'Play 5-10 random excerpts cold to test audition readiness' },
  technique_assessment: { icon: BookOpen, label: 'Technique Assessment', color: 'var(--pf-accent-teal)', description: 'Evaluate skills by category with generated exercises' },
  weekly_review: { icon: Calendar, label: 'Weekly Review', color: 'var(--pf-status-in-progress)', description: 'Automated summary of your practice week' },
};

const RATING_COLORS: Record<string, string> = {
  needs_work: 'var(--pf-status-needs-work)',
  acceptable: 'var(--pf-accent-gold)',
  solid: 'var(--pf-status-in-progress)',
  excellent: 'var(--pf-status-ready)',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function AssessmentsPage() {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPiece, setSelectedPiece] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(() => {
    api.getAssessments().then(d => setAssessments(d as Assessment[])).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    api.getPieces().then(d => setPieces((d as Piece[]).filter(p => p.status !== 'archived'))).catch(() => {});
  }, [load]);

  const handleStartPieceAudit = async () => {
    if (!selectedPiece) return;
    setLoading(true);
    try {
      const assessment = await api.createAssessment({ type: 'piece_audit', piece_id: selectedPiece }) as Assessment;
      // Navigate to recording page with assessment context
      const piece = pieces.find(p => p.id === selectedPiece);
      // Find linked score file
      const files = await api.getFiles({ linked_type: 'piece', linked_id: selectedPiece }) as any[];
      const scoreFile = files.find((f: any) => f.file_type === 'sheet_music_digital' || f.file_type === 'sheet_music_scanned');
      const params = new URLSearchParams({
        linked_type: 'piece',
        linked_id: selectedPiece,
      });
      if (scoreFile) params.set('fileId', scoreFile.id);
      navigate(`/record?${params.toString()}`);
    } catch {}
    setLoading(false);
  };

  const handleSpotCheck = async () => {
    setLoading(true);
    try {
      const assessment = await api.generateSpotCheck(5) as any;
      load();
      setExpandedId(assessment.id);
    } catch {}
    setLoading(false);
  };

  const handleWeeklyReview = async () => {
    setLoading(true);
    try {
      await api.generateWeeklyReview();
      load();
    } catch {}
    setLoading(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <ClipboardCheck size={24} style={{ color: 'var(--pf-accent-gold)' }} />
        Assessments
      </h1>

      {/* Create new assessment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Piece Audit */}
        <Card className="hover:shadow-pf-lg transition-shadow">
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Music size={18} style={{ color: 'var(--pf-accent-gold)' }} />
              <h3 className="text-sm font-semibold">Piece Audit</h3>
            </div>
            <p className="text-xs text-[var(--pf-text-secondary)]">Record a play-through with bar-by-bar scoring</p>
            <select
              value={selectedPiece}
              onChange={e => setSelectedPiece(e.target.value)}
              className="w-full text-xs px-2 py-1.5 rounded border border-[var(--pf-border-color)] bg-[var(--pf-bg-input)] text-[var(--pf-text-primary)]"
            >
              <option value="">Select piece...</option>
              {pieces.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
            <Button size="sm" className="w-full" onClick={handleStartPieceAudit} disabled={!selectedPiece || loading}>
              Start Audit
            </Button>
          </CardContent>
        </Card>

        {/* Excerpt Spot-Check */}
        <Card className="hover:shadow-pf-lg transition-shadow">
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <ListMusic size={18} style={{ color: 'var(--pf-accent-lavender)' }} />
              <h3 className="text-sm font-semibold">Spot-Check</h3>
            </div>
            <p className="text-xs text-[var(--pf-text-secondary)]">5 random excerpts played cold</p>
            <Button size="sm" variant="secondary" className="w-full" onClick={handleSpotCheck} disabled={loading}>
              {loading ? <Loader size={14} className="animate-spin" /> : 'Generate'}
            </Button>
          </CardContent>
        </Card>

        {/* Technique Assessment — placeholder */}
        <Card className="hover:shadow-pf-lg transition-shadow">
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen size={18} style={{ color: 'var(--pf-accent-teal)' }} />
              <h3 className="text-sm font-semibold">Technique</h3>
            </div>
            <p className="text-xs text-[var(--pf-text-secondary)]">Category-by-category skill evaluation</p>
            <Button size="sm" variant="secondary" className="w-full" disabled>Coming soon</Button>
          </CardContent>
        </Card>

        {/* Weekly Review */}
        <Card className="hover:shadow-pf-lg transition-shadow">
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar size={18} style={{ color: 'var(--pf-status-in-progress)' }} />
              <h3 className="text-sm font-semibold">Weekly Review</h3>
            </div>
            <p className="text-xs text-[var(--pf-text-secondary)]">Auto-generated practice summary</p>
            <Button size="sm" variant="secondary" className="w-full" onClick={handleWeeklyReview} disabled={loading}>
              {loading ? <Loader size={14} className="animate-spin" /> : 'Generate Review'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Assessment history */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">History</h2>
        </CardHeader>
        <CardContent>
          {assessments.length === 0 ? (
            <p className="text-sm text-[var(--pf-text-secondary)] text-center py-8">No assessments yet. Start one above.</p>
          ) : (
            <div className="space-y-2">
              {assessments.map(a => {
                const conf = TYPE_CONFIG[a.type] || TYPE_CONFIG.piece_audit;
                const Icon = conf.icon;
                const isExpanded = expandedId === a.id;
                const piece = a.piece_id ? pieces.find(p => p.id === a.piece_id) : null;

                return (
                  <div key={a.id} className="border border-[var(--pf-border-color)] rounded-pf overflow-hidden">
                    <button
                      className="w-full flex items-center gap-3 p-3 text-left hover:bg-[var(--pf-bg-hover)] transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : a.id)}
                    >
                      <Icon size={16} style={{ color: conf.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">
                          {conf.label}
                          {piece && <span className="text-[var(--pf-text-secondary)] font-normal"> — {piece.title}</span>}
                        </div>
                        <div className="text-xs text-[var(--pf-text-secondary)]">{formatDate(a.created_at)}</div>
                      </div>
                      {a.overall_rating && (
                        <Badge color={RATING_COLORS[a.overall_rating]}>{a.overall_rating.replace('_', ' ')}</Badge>
                      )}
                      {a.overall_score != null && (
                        <span className="text-sm font-mono font-bold" style={{ color: a.overall_score >= 80 ? 'var(--pf-status-ready)' : a.overall_score >= 60 ? 'var(--pf-accent-gold)' : 'var(--pf-status-needs-work)' }}>
                          {a.overall_score}%
                        </span>
                      )}
                      <Badge color={a.status === 'completed' ? 'var(--pf-status-ready)' : 'var(--pf-text-secondary)'}>{a.status}</Badge>
                      <ChevronRight size={14} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>

                    {isExpanded && (
                      <div className="p-4 pt-0 border-t border-[var(--pf-border-color)]">
                        {a.type === 'weekly_review' && a.results && (
                          <WeeklyReviewCard data={a.results as unknown as WeeklyReviewData} />
                        )}
                        {a.type === 'excerpt_spot_check' && a.results && (
                          <SpotCheckCard results={a.results as any} />
                        )}
                        {a.notes && <p className="text-xs text-[var(--pf-text-secondary)] mt-2 italic">"{a.notes}"</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function WeeklyReviewCard({ data }: { data: WeeklyReviewData }) {
  return (
    <div className="pt-3 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div>
          <div className="text-xl font-bold">{data.total_practice_hours}h</div>
          <div className="text-xs text-[var(--pf-text-secondary)]">Practice time</div>
        </div>
        <div>
          <div className="text-xl font-bold">{data.sessions_completed}</div>
          <div className="text-xs text-[var(--pf-text-secondary)]">Sessions</div>
        </div>
        <div>
          <div className="text-xl font-bold">{data.recordings_made}</div>
          <div className="text-xs text-[var(--pf-text-secondary)]">Recordings</div>
        </div>
        <div>
          <div className="text-xl font-bold">{data.avg_pitch_accuracy != null ? `${data.avg_pitch_accuracy}%` : '—'}</div>
          <div className="text-xs text-[var(--pf-text-secondary)]">Avg pitch accuracy</div>
        </div>
      </div>

      {Object.keys(data.category_breakdown).length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-[var(--pf-text-secondary)] mb-1">Time by category</h4>
          <div className="space-y-1">
            {Object.entries(data.category_breakdown).map(([cat, min]) => (
              <div key={cat} className="flex items-center gap-2 text-xs">
                <span className="w-24 text-[var(--pf-text-secondary)] capitalize">{cat}</span>
                <div className="flex-1 h-2 bg-[var(--pf-bg-hover)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--pf-accent-teal)]" style={{ width: `${Math.min(100, (min / data.total_practice_minutes) * 100)}%` }} />
                </div>
                <span className="w-10 text-right">{min}m</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.status_changes.sections.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-[var(--pf-text-secondary)] mb-1">Progress this week</h4>
          <div className="space-y-1">
            {data.status_changes.sections.slice(0, 5).map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <TrendingUp size={12} style={{ color: 'var(--pf-status-ready)' }} />
                <span>{s.piece_title} — {s.name}: <strong>{s.status.replace('_', ' ')}</strong></span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SpotCheckCard({ results }: { results: { excerpts?: { id: string; title: string; composer: string; status: string }[] } }) {
  if (!results.excerpts) return null;
  return (
    <div className="pt-3">
      <h4 className="text-xs font-semibold text-[var(--pf-text-secondary)] mb-2">Excerpts to play</h4>
      <div className="space-y-1">
        {results.excerpts.map((ex, i) => (
          <div key={ex.id} className="flex items-center gap-2 text-sm">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-[var(--pf-bg-hover)]">{i + 1}</span>
            <span className="flex-1">{ex.title}</span>
            <span className="text-xs text-[var(--pf-text-secondary)]">{ex.composer}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
