import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { StatusIndicator } from '../components/ui/StatusIndicator';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { PIECE_STATUS_CONFIG, PRIORITY_CONFIG, EXCERPT_STATUS_CONFIG } from '../core/constants';
import { api } from '../api/client';
import type { Piece, Excerpt } from '../core/types';
import { Play, Clock, Flame, Target, AlertTriangle, CheckCircle, BarChart3, Music, BookOpen, Mic, PenLine, ChevronDown, ChevronUp, ThumbsUp, Meh, ThumbsDown, Info, X, Trophy, CalendarDays } from 'lucide-react';
import { AuditionCountdown } from '../components/auditions/AuditionCountdown';
import { useExperienceLevel } from '../hooks/useExperienceLevel';

interface Stats {
  weekHours: number;
  weekSessions: number;
  streak: number;
}

interface RotationEntry {
  id: string;
  excerpt_id: string;
  practiced: number;
  title: string;
  composer: string;
  status: string;
  difficulty: number;
}

export function DashboardPage() {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [stats, setStats] = useState<Stats>({ weekHours: 0, weekSessions: 0, streak: 0 });
  const [rotation, setRotation] = useState<RotationEntry[]>([]);
  const [excerpts, setExcerpts] = useState<Excerpt[]>([]);
  const [driftAlerts, setDriftAlerts] = useState<string[]>([]);
  const [longestStreak, setLongestStreak] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [timeAlloc, setTimeAlloc] = useState({ warmup: 15, fundamentals: 10, technique: 20, repertoire: 35, excerpts: 15, buffer: 5 });
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [qlNotes, setQlNotes] = useState('');
  const [qlDuration, setQlDuration] = useState(30);
  const [qlRating, setQlRating] = useState<string | null>(null);
  const [qlSubmitting, setQlSubmitting] = useState(false);
  const [qlSuccess, setQlSuccess] = useState(false);
  const navigate = useNavigate();
  const { level: experienceLevel } = useExperienceLevel();
  const showExcerptHelp = experienceLevel === 'beginner' || experienceLevel === 'intermediate';
  const [sessionExplainerDismissed, setSessionExplainerDismissed] = useState(() => localStorage.getItem('pf-dismissed-session-explainer') === 'true');

  useEffect(() => {
    api.getPieces().then(d => setPieces(d as Piece[])).catch(() => {});
    api.getSessionStats().then(d => setStats(d as Stats)).catch(() => {});
    api.getTodayRotation().then(d => setRotation(d as RotationEntry[])).catch(() => {});
    api.getExcerpts().then(d => setExcerpts(d as Excerpt[])).catch(() => {});
    api.getAnalyticsStreaks().then((d) => {
      setLongestStreak(d.longest_streak);
      setTotalHours(d.total_hours);
    }).catch(() => {});
    api.getAnalyticsDrift().then((d: any) => {
      if (d?.alerts) setDriftAlerts(d.alerts);
    }).catch(() => {});
    api.getSettings().then((d: any) => {
      if (d?.timeAllocation) setTimeAlloc(prev => ({ ...prev, ...d.timeAllocation }));
    }).catch(() => {});
  }, []);

  const activePieces = pieces.filter(p => p.status !== 'archived');
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Alerts
  const alerts: { color: string; text: string }[] = [];
  for (const p of activePieces) {
    if (p.target_date) {
      const days = Math.ceil((new Date(p.target_date).getTime() - Date.now()) / 86400000);
      if (days <= 7 && days >= 0) {
        const notReady = p.sections.filter(s => s.status !== 'polished' && s.status !== 'solid');
        if (notReady.length > 0) {
          alerts.push({ color: 'var(--pf-status-needs-work)', text: `${p.title} target in ${days} days — ${notReady.length} section${notReady.length > 1 ? 's' : ''} still need work` });
        }
      }
    }
  }
  const staleExcerpts = excerpts.filter(e => {
    if (!e.last_practiced) return true;
    const days = Math.ceil((Date.now() - new Date(e.last_practiced).getTime()) / 86400000);
    return days > 20;
  });
  if (staleExcerpts.length > 0) {
    alerts.push({ color: 'var(--pf-accent-gold)', text: `${staleExcerpts.length} excerpt${staleExcerpts.length > 1 ? 's' : ''} not practiced in 20+ days` });
  }
  for (const da of driftAlerts) {
    alerts.push({ color: 'var(--pf-status-needs-work)', text: da });
  }

  // Excerpt status counts for donut
  const excerptCounts = {
    audition_ready: excerpts.filter(e => e.status === 'audition_ready').length,
    solid: excerpts.filter(e => e.status === 'solid').length,
    acceptable: excerpts.filter(e => e.status === 'acceptable').length,
    needs_work: excerpts.filter(e => e.status === 'needs_work').length,
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <span className="text-[var(--pf-text-secondary)]">{today}</span>
      </div>

      {/* First-run onboarding */}
      {activePieces.length === 0 && excerpts.length === 0 && stats.weekSessions === 0 && (
        <Card className="mb-6">
          <CardContent className="py-8">
            <h2 className="text-xl font-semibold text-center mb-2">Welcome to Practice Forge</h2>
            <p className="text-sm text-[var(--pf-text-secondary)] text-center mb-6 max-w-md mx-auto">Get started in three steps — add your music, then let the app plan your practice sessions.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
              <Link to="/pieces" className="flex flex-col items-center gap-2 p-4 rounded-pf border border-[var(--pf-border-color)] hover:border-[var(--pf-accent-gold)] transition-colors">
                <Music size={24} style={{ color: 'var(--pf-accent-gold)' }} />
                <span className="text-sm font-medium">1. Add a piece</span>
                <span className="text-xs text-[var(--pf-text-secondary)]">Your repertoire</span>
              </Link>
              <Link to="/media" className="flex flex-col items-center gap-2 p-4 rounded-pf border border-[var(--pf-border-color)] hover:border-[var(--pf-accent-teal)] transition-colors">
                <BookOpen size={24} style={{ color: 'var(--pf-accent-teal)' }} />
                <span className="text-sm font-medium">2. Upload music</span>
                <span className="text-xs text-[var(--pf-text-secondary)]">Scores & recordings</span>
              </Link>
              <Link to="/session" className="flex flex-col items-center gap-2 p-4 rounded-pf border border-[var(--pf-border-color)] hover:border-[var(--pf-accent-lavender)] transition-colors">
                <Play size={24} style={{ color: 'var(--pf-accent-lavender)' }} />
                <span className="text-sm font-medium">3. Start practising</span>
                <span className="text-xs text-[var(--pf-text-secondary)]">AI-planned sessions</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* How Sessions Work — beginner explainer */}
      {experienceLevel === 'beginner' && !sessionExplainerDismissed && (
        <Card className="mb-6" style={{ borderColor: 'var(--pf-accent-teal)', borderWidth: '1px', borderStyle: 'solid', backgroundColor: 'color-mix(in srgb, var(--pf-accent-teal) 5%, var(--pf-bg-primary))' }}>
          <CardContent>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Info size={18} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--pf-accent-teal)' }} />
                <div>
                  <h2 className="text-sm font-semibold mb-2">How Practice Sessions Work</h2>
                  <ol className="text-xs text-[var(--pf-text-secondary)] space-y-1 list-decimal list-inside">
                    <li>Choose how long you have (30-120 min)</li>
                    <li>The app builds a structured plan with warm-up, technique, and repertoire</li>
                    <li>Follow the timer through each block</li>
                    <li>Mark each block "Done" as you finish</li>
                    <li>Rate your session at the end</li>
                  </ol>
                  <p className="text-xs text-[var(--pf-text-secondary)] mt-2">Time allocation is based on your pieces and settings. You can customise it in Settings.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  localStorage.setItem('pf-dismissed-session-explainer', 'true');
                  setSessionExplainerDismissed(true);
                }}
                className="text-[var(--pf-text-secondary)] hover:text-[var(--pf-text-primary)] flex-shrink-0"
                title="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top row: Session + Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold mb-1">Today's Session</h2>
              <p className="text-sm text-[var(--pf-text-secondary)]">
                {activePieces.length} active piece{activePieces.length !== 1 ? 's' : ''} &middot; {rotation.length} excerpt{rotation.length !== 1 ? 's' : ''} in rotation
              </p>
              {/* Category mini-bar — driven by time allocation settings */}
              <div className="flex gap-0.5 mt-3 h-2 w-48 rounded-full overflow-hidden">
                <div className="h-full" style={{ flex: timeAlloc.warmup, backgroundColor: 'var(--pf-accent-gold)' }} />
                <div className="h-full" style={{ flex: timeAlloc.fundamentals, backgroundColor: 'var(--pf-accent-teal)' }} />
                <div className="h-full" style={{ flex: timeAlloc.technique, backgroundColor: 'var(--pf-accent-teal)' }} />
                <div className="h-full" style={{ flex: timeAlloc.repertoire, backgroundColor: 'var(--pf-status-in-progress)' }} />
                <div className="h-full" style={{ flex: timeAlloc.excerpts, backgroundColor: 'var(--pf-accent-lavender)' }} />
                <div className="h-full" style={{ flex: timeAlloc.buffer, backgroundColor: 'var(--pf-text-secondary)' }} />
              </div>
              <p className="text-xs text-[var(--pf-text-secondary)] mt-1">Warm-up → Fundamentals → Technique → Repertoire → Excerpts</p>
            </div>
            <Button onClick={() => navigate('/session')}>
              <Play size={16} /> Start Session
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{stats.weekHours}<span className="text-sm font-normal text-[var(--pf-text-secondary)]">h</span></div>
                <div className="text-xs text-[var(--pf-text-secondary)]">This week</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.weekSessions}</div>
                <div className="text-xs text-[var(--pf-text-secondary)]">Sessions</div>
              </div>
              <div>
                <div className="text-2xl font-bold flex items-center justify-center gap-1">
                  {stats.streak}
                  {stats.streak > 0 && <Flame size={18} style={{ color: 'var(--pf-accent-gold)' }} />}
                </div>
                <div className="text-xs text-[var(--pf-text-secondary)]">Day streak</div>
              </div>
              <div>
                <div className="text-2xl font-bold flex items-center justify-center gap-1">
                  {longestStreak}
                  {longestStreak > 0 && <Trophy size={16} style={{ color: 'var(--pf-accent-blue, #3b82f6)' }} />}
                </div>
                <div className="text-xs text-[var(--pf-text-secondary)]">Best streak</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{totalHours}<span className="text-sm font-normal text-[var(--pf-text-secondary)]">h</span></div>
                <div className="text-xs text-[var(--pf-text-secondary)]">All time</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{activePieces.length}</div>
                <div className="text-xs text-[var(--pf-text-secondary)]">Pieces</div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-[var(--pf-border-color)]">
              <Link to="/analytics" className="text-xs font-medium inline-flex items-center gap-1" style={{ color: 'var(--pf-accent-gold)' }}>
                <BarChart3 size={12} /> Analytics
              </Link>
              <Link to="/calendar" className="text-xs font-medium inline-flex items-center gap-1" style={{ color: 'var(--pf-accent-gold)' }}>
                <CalendarDays size={12} /> Calendar
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audition Countdown */}
      <div className="mb-6">
        <AuditionCountdown />
      </div>

      {/* Quick Log */}
      <div className="mb-6">
        {!quickLogOpen ? (
          <button
            onClick={() => setQuickLogOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-pf border border-[var(--pf-border-color)] text-sm font-medium text-[var(--pf-text-primary)] hover:border-[var(--pf-accent-gold)] transition-colors"
          >
            <PenLine size={16} style={{ color: 'var(--pf-accent-gold)' }} /> Log Practice
          </button>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">Quick Log</h2>
                  <p className="text-xs text-[var(--pf-text-secondary)] mt-0.5">Log what you practised</p>
                </div>
                <button onClick={() => { setQuickLogOpen(false); setQlSuccess(false); }} className="text-[var(--pf-text-secondary)] hover:text-[var(--pf-text-primary)]">
                  <ChevronUp size={18} />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {qlSuccess ? (
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--pf-status-ready)' }}>
                  <CheckCircle size={16} /> Practice logged successfully
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    value={qlNotes}
                    onChange={e => setQlNotes(e.target.value)}
                    placeholder="What did you practise? e.g. Scales 20 min, Mozart concerto 40 min"
                    rows={3}
                    className="w-full px-3 py-2 rounded-pf border border-[var(--pf-border-color)] bg-[var(--pf-bg-primary)] text-[var(--pf-text-primary)] text-sm resize-none focus:outline-none focus:border-[var(--pf-accent-gold)]"
                  />
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-[var(--pf-text-secondary)]">Duration</label>
                      <input
                        type="number"
                        min={1}
                        value={qlDuration}
                        onChange={e => setQlDuration(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-20 px-2 py-1.5 rounded-pf border border-[var(--pf-border-color)] bg-[var(--pf-bg-primary)] text-[var(--pf-text-primary)] text-sm focus:outline-none focus:border-[var(--pf-accent-gold)]"
                      />
                      <span className="text-sm text-[var(--pf-text-secondary)]">min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[
                        { rating: 'good', icon: ThumbsUp, label: 'Good', color: 'var(--pf-status-ready)' },
                        { rating: 'okay', icon: Meh, label: 'Okay', color: 'var(--pf-accent-gold)' },
                        { rating: 'bad', icon: ThumbsDown, label: 'Tough', color: 'var(--pf-status-needs-work)' },
                      ].map(({ rating, icon: Icon, label, color }) => (
                        <button
                          key={rating}
                          onClick={() => setQlRating(qlRating === rating ? null : rating)}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-pf text-xs font-medium transition-colors border"
                          style={{
                            borderColor: qlRating === rating ? color : 'var(--pf-border-color)',
                            backgroundColor: qlRating === rating ? `color-mix(in srgb, ${color} 12%, transparent)` : 'transparent',
                            color: qlRating === rating ? color : 'var(--pf-text-secondary)',
                          }}
                        >
                          <Icon size={14} /> {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="secondary" size="sm" onClick={() => { setQuickLogOpen(false); setQlSuccess(false); }}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={qlSubmitting || !qlNotes.trim()}
                      onClick={async () => {
                        setQlSubmitting(true);
                        try {
                          await api.quickLog({ notes: qlNotes.trim(), duration_min: qlDuration, rating: qlRating || undefined });
                          setQlNotes('');
                          setQlDuration(30);
                          setQlRating(null);
                          setQlSuccess(true);
                          setTimeout(() => { setQlSuccess(false); setQuickLogOpen(false); }, 2000);
                          // Refresh stats
                          api.getSessionStats().then(d => setStats(d as Stats)).catch(() => {});
                        } catch { /* ignore */ }
                        setQlSubmitting(false);
                      }}
                    >
                      <CheckCircle size={14} /> {qlSubmitting ? 'Logging...' : 'Log Practice'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Middle row: Active Pieces + Excerpt progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Active Pieces</h2>
                <Link to="/pieces" className="text-xs" style={{ color: 'var(--pf-accent-gold)' }}>View all</Link>
              </div>
            </CardHeader>
            <CardContent>
              {activePieces.length === 0 ? (
                <p className="text-sm text-[var(--pf-text-secondary)]">No active pieces. <Link to="/pieces" className="underline">Add a piece</Link> to see your repertoire and progress here.</p>
              ) : (
                <div className="space-y-3">
                  {activePieces.slice(0, 5).map(piece => {
                    const statusConf = PIECE_STATUS_CONFIG[piece.status];
                    const priorityConf = PRIORITY_CONFIG[piece.priority];
                    const daysUntil = piece.target_date
                      ? Math.ceil((new Date(piece.target_date).getTime() - Date.now()) / 86400000)
                      : null;
                    return (
                      <Link key={piece.id} to={`/pieces/${piece.id}`} className="flex items-center gap-3 py-2 hover:bg-[var(--pf-bg-hover)] rounded-pf-sm px-2 -mx-2 transition-colors">
                        <Badge color={piece.priority === 'high' ? 'var(--pf-status-needs-work)' : piece.priority === 'medium' ? 'var(--pf-accent-gold)' : 'var(--pf-text-secondary)'}>{priorityConf.label}</Badge>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{piece.title}</div>
                          <div className="text-xs text-[var(--pf-text-secondary)]">{piece.composer}</div>
                        </div>
                        {piece.sections.length > 0 && (
                          <div className="flex gap-0.5 w-28">
                            {piece.sections.map(s => {
                              const cv = s.status === 'polished' ? '--pf-status-ready' : s.status === 'solid' ? '--pf-status-solid' : s.status === 'working_on' ? '--pf-status-in-progress' : '--pf-status-not-started';
                              return <div key={s.id} className="flex-1 h-2 rounded-full" style={{ backgroundColor: `var(${cv})` }} />;
                            })}
                          </div>
                        )}
                        {daysUntil != null && (
                          <span className={`text-xs font-medium ${daysUntil <= 7 ? 'text-[var(--pf-status-needs-work)]' : 'text-[var(--pf-text-secondary)]'}`}>
                            {daysUntil > 0 ? `${daysUntil}d` : 'Due'}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Excerpt progress */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-semibold">Excerpt progress</h2>
                {showExcerptHelp && (
                  <div className="relative group">
                    <Info size={14} className="text-[var(--pf-text-secondary)] cursor-help" />
                    <div className="invisible group-hover:visible absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-10 w-[250px] px-3 py-2 rounded-pf bg-[var(--pf-bg-secondary)] border border-[var(--pf-border-color)] shadow-lg text-xs text-[var(--pf-text-secondary)] leading-relaxed">
                      Excerpts are short orchestral passages practiced regularly for auditions and orchestra preparation.
                    </div>
                  </div>
                )}
              </div>
              <Link to="/excerpts" className="text-xs" style={{ color: 'var(--pf-accent-gold)' }}>View all</Link>
            </div>
          </CardHeader>
          <CardContent>
            {excerpts.length === 0 ? (
              <p className="text-sm text-[var(--pf-text-secondary)]">No excerpts yet. Add orchestral excerpts to track your audition prep and keep them in rotation.</p>
            ) : (
              <>
                {/* Simple status breakdown */}
                <div className="flex items-center justify-center mb-4">
                  <div className="text-3xl font-bold" style={{ color: 'var(--pf-accent-gold)' }}>{excerpts.length}</div>
                  <span className="text-sm text-[var(--pf-text-secondary)] ml-2">total</span>
                </div>
                <div className="space-y-1.5 text-sm">
                  {Object.entries(excerptCounts).map(([status, count]) => {
                    if (count === 0) return null;
                    const conf = EXCERPT_STATUS_CONFIG[status as keyof typeof EXCERPT_STATUS_CONFIG];
                    return (
                      <div key={status} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `var(${conf.colorVar})` }} />
                        <span className="flex-1">{conf.label}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Today's rotation */}
                {rotation.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-[var(--pf-border-color)]">
                    <div className="flex items-center gap-1.5 mb-2">
                      <h3 className="text-xs font-semibold text-[var(--pf-text-secondary)]">TODAY'S EXCERPTS</h3>
                      {showExcerptHelp && (
                        <div className="relative group">
                          <Info size={12} className="text-[var(--pf-text-secondary)] cursor-help" />
                          <div className="invisible group-hover:visible absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-10 w-[250px] px-3 py-2 rounded-pf bg-[var(--pf-bg-secondary)] border border-[var(--pf-border-color)] shadow-lg text-xs text-[var(--pf-text-secondary)] leading-relaxed">
                            These are the excerpts selected for today's rotation. Practise each one to keep your audition repertoire fresh.
                          </div>
                        </div>
                      )}
                    </div>
                    {rotation.map(r => {
                      const sConf = EXCERPT_STATUS_CONFIG[r.status as keyof typeof EXCERPT_STATUS_CONFIG] || EXCERPT_STATUS_CONFIG.needs_work;
                      return (
                        <div key={r.id} className="flex items-center gap-2 py-1 text-sm">
                          <div className="w-1 h-4 rounded-full" style={{ backgroundColor: `var(${sConf.colorVar})` }} />
                          <span className="flex-1 truncate">{r.title}</span>
                          {r.practiced ? <CheckCircle size={14} style={{ color: 'var(--pf-status-ready)' }} /> : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader><h2 className="text-base font-semibold">Alerts & Nudges</h2></CardHeader>
          <CardContent className="space-y-2">
            {alerts.map((alert, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <div className="w-1 h-5 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: alert.color }} />
                <span>{alert.text}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
