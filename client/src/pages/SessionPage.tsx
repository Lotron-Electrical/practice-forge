import { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { api } from '../api/client';
import { Play, CheckCircle, SkipForward, Square, Clock, Sparkles, Music, BookOpen, ListMusic, Zap, Timer, ThumbsUp, Meh, ThumbsDown } from 'lucide-react';

interface Block {
  id: string;
  category: string;
  title: string;
  description: string;
  planned_duration_min: number;
  actual_duration_min: number | null;
  sort_order: number;
  status: string;
  linked_type: string | null;
  linked_id: string | null;
  focus_points: string;
  notes: string;
}

interface Session {
  id: string;
  date: string;
  planned_duration_min: number;
  actual_duration_min: number | null;
  status: string;
  rating: string | null;
  notes: string;
  blocks: Block[];
}

const CATEGORY_CONFIG: Record<string, { icon: typeof Play; color: string; label: string }> = {
  warmup: { icon: Sparkles, color: 'var(--pf-accent-gold)', label: 'Warm-up' },
  fundamentals: { icon: Zap, color: 'var(--pf-accent-teal)', label: 'Fundamentals' },
  technique: { icon: BookOpen, color: 'var(--pf-accent-teal)', label: 'Technique' },
  repertoire: { icon: Music, color: 'var(--pf-status-in-progress)', label: 'Repertoire' },
  excerpts: { icon: ListMusic, color: 'var(--pf-accent-lavender)', label: 'Excerpts' },
  buffer: { icon: Timer, color: 'var(--pf-text-secondary)', label: 'Buffer' },
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function SessionPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [duration, setDuration] = useState(60);
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadCurrent = useCallback(() => {
    api.getCurrentSession().then(data => {
      setSession(data as Session | null);
    }).catch(() => {});
  }, []);

  useEffect(() => { loadCurrent(); }, [loadCurrent]);

  // Timer
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  const activeBlock = session?.blocks.find(b => b.status === 'active');
  const activeBlockTarget = activeBlock ? activeBlock.planned_duration_min * 60 : 0;

  const generate = async () => {
    const data = await api.generateSession(duration) as Session;
    setSession(data);
  };

  const start = async () => {
    if (!session) return;
    const data = await api.startSession(session.id) as Session;
    setSession(data);
    setTimer(0);
    setTimerRunning(true);
  };

  const completeBlock = async (blockId: string) => {
    if (!session) return;
    const actualMin = Math.round(timer / 60) || 1;
    const data = await api.completeBlock(session.id, blockId, { actual_duration_min: actualMin }) as Session;
    setSession(data);
    setTimer(0);
    // If there's a next active block, keep timer running
    const nextActive = data.blocks.find(b => b.status === 'active');
    if (!nextActive) {
      setTimerRunning(false);
      setShowComplete(true);
    }
  };

  const skipBlock = async (blockId: string) => {
    if (!session) return;
    const data = await api.skipBlock(session.id, blockId) as Session;
    setSession(data);
    setTimer(0);
    const nextActive = data.blocks.find(b => b.status === 'active');
    if (!nextActive) {
      setTimerRunning(false);
      setShowComplete(true);
    }
  };

  const finishSession = async (rating: string) => {
    if (!session) return;
    const data = await api.completeSession(session.id, { rating }) as Session;
    setSession(data);
    setShowComplete(false);
    setTimerRunning(false);
  };

  // No session yet — generate one
  if (!session) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Practice Session</h1>
        <Card>
          <CardContent className="text-center py-12">
            <Clock size={48} className="mx-auto mb-4" style={{ color: 'var(--pf-accent-gold)' }} />
            <h2 className="text-xl font-semibold mb-2">Plan your session</h2>
            <p className="text-[var(--pf-text-secondary)] mb-6">Choose your available time and the planner will build a structured session based on your pieces, exercises, and excerpt rotation.</p>
            <div className="flex items-center justify-center gap-4 mb-6">
              {[30, 45, 60, 90, 120].map(m => (
                <button
                  key={m}
                  onClick={() => setDuration(m)}
                  className={`px-4 py-2 rounded-pf text-sm font-medium transition-colors ${duration === m ? 'text-white' : 'text-[var(--pf-text-primary)] border border-[var(--pf-border-color)]'}`}
                  style={duration === m ? { backgroundColor: 'var(--pf-accent-gold)' } : undefined}
                >
                  {m} min
                </button>
              ))}
            </div>
            <Button size="lg" onClick={generate}>
              <Sparkles size={18} /> Generate Session
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Completed session
  if (session.status === 'completed') {
    const completed = session.blocks.filter(b => b.status === 'completed').length;
    const skipped = session.blocks.filter(b => b.status === 'skipped').length;
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Session Complete</h1>
        <Card>
          <CardContent className="text-center py-10">
            <CheckCircle size={56} className="mx-auto mb-4" style={{ color: 'var(--pf-status-ready)' }} />
            <h2 className="text-xl font-semibold mb-2">Well done!</h2>
            <div className="flex justify-center gap-8 mb-4 text-sm">
              <div><span className="text-2xl font-bold">{session.actual_duration_min || session.planned_duration_min}</span><br /><span className="text-[var(--pf-text-secondary)]">minutes</span></div>
              <div><span className="text-2xl font-bold">{completed}</span><br /><span className="text-[var(--pf-text-secondary)]">completed</span></div>
              <div><span className="text-2xl font-bold">{skipped}</span><br /><span className="text-[var(--pf-text-secondary)]">skipped</span></div>
            </div>
            {session.rating && <Badge color="var(--pf-accent-gold)">{session.rating}</Badge>}
            <div className="mt-6">
              <Button variant="secondary" onClick={() => setSession(null)}>Plan New Session</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Rate session modal
  if (showComplete) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Rate Your Session</h1>
        <Card>
          <CardContent className="text-center py-10">
            <h2 className="text-xl font-semibold mb-6">How did it go?</h2>
            <div className="flex justify-center gap-6">
              {[
                { rating: 'good', icon: ThumbsUp, label: 'Good', color: 'var(--pf-status-ready)' },
                { rating: 'okay', icon: Meh, label: 'Okay', color: 'var(--pf-accent-gold)' },
                { rating: 'bad', icon: ThumbsDown, label: 'Tough', color: 'var(--pf-status-needs-work)' },
              ].map(({ rating, icon: Icon, label, color }) => (
                <button
                  key={rating}
                  onClick={() => finishSession(rating)}
                  className="flex flex-col items-center gap-2 p-6 rounded-pf border-2 border-[var(--pf-border-color)] hover:border-[var(--pf-accent-gold)] transition-colors"
                >
                  <Icon size={36} style={{ color }} />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Active session view
  const totalPlanned = session.blocks.reduce((s, b) => s + b.planned_duration_min, 0);
  const completedMin = session.blocks.filter(b => b.status === 'completed').reduce((s, b) => s + (b.actual_duration_min || b.planned_duration_min), 0);
  const isStarted = session.status === 'in_progress';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Practice Session</h1>
        <span className="text-[var(--pf-text-secondary)]">{totalPlanned} minutes planned</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main block list */}
        <div className="lg:col-span-2 space-y-3">
          {/* Timer bar */}
          {isStarted && activeBlock && (
            <Card className="overflow-hidden">
              <div className="h-1" style={{ backgroundColor: 'var(--pf-accent-gold)', width: `${Math.min(100, (timer / activeBlockTarget) * 100)}%`, transition: 'width 1s linear' }} />
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-mono font-bold" style={{ color: timer > activeBlockTarget ? 'var(--pf-status-needs-work)' : 'var(--pf-text-primary)' }}>
                    {formatTime(timer)}
                  </div>
                  <span className="text-sm text-[var(--pf-text-secondary)]">/ {formatTime(activeBlockTarget)}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setTimerRunning(!timerRunning)}>
                    {timerRunning ? <Square size={16} /> : <Play size={16} />}
                    {timerRunning ? 'Pause' : 'Resume'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Start button */}
          {!isStarted && (
            <Card>
              <CardContent className="text-center py-6">
                <Button size="lg" onClick={start}>
                  <Play size={18} /> Start Session
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Blocks */}
          {session.blocks.map((block, i) => {
            const conf = CATEGORY_CONFIG[block.category] || CATEGORY_CONFIG.buffer;
            const Icon = conf.icon;
            const isActive = block.status === 'active';
            const isCompleted = block.status === 'completed';
            const isSkipped = block.status === 'skipped';

            return (
              <Card
                key={block.id}
                borderColor={isActive ? conf.color : undefined}
                className={`transition-all ${isActive ? 'ring-2 ring-[var(--pf-accent-gold)]/30' : ''} ${isCompleted || isSkipped ? 'opacity-60' : ''}`}
              >
                <CardContent className="flex items-start gap-4 py-3">
                  {/* Status icon */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: isCompleted ? 'var(--pf-status-ready)' : isSkipped ? 'var(--pf-text-secondary)' : `${conf.color}20`, color: isCompleted ? 'white' : isSkipped ? 'white' : conf.color }}
                  >
                    {isCompleted ? <CheckCircle size={16} /> : isSkipped ? <SkipForward size={16} /> : <Icon size={16} />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-sm">{block.title}</span>
                      <Badge color={conf.color}>{conf.label}</Badge>
                      <span className="text-xs text-[var(--pf-text-secondary)]">{block.planned_duration_min} min</span>
                    </div>
                    {block.description && (
                      <p className="text-xs text-[var(--pf-text-secondary)]">{block.description}</p>
                    )}
                    {block.focus_points && (
                      <p className="text-xs mt-1" style={{ color: conf.color }}>Focus: {block.focus_points}</p>
                    )}
                    {isCompleted && block.actual_duration_min && (
                      <span className="text-xs text-[var(--pf-text-secondary)]">Completed in {block.actual_duration_min} min</span>
                    )}
                  </div>

                  {/* Actions */}
                  {isActive && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" onClick={() => completeBlock(block.id)}>
                        <CheckCircle size={14} /> Done
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => skipBlock(block.id)}>
                        <SkipForward size={14} /> Skip
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Time allocation */}
          <Card>
            <CardHeader><h2 className="text-sm font-semibold">Time Allocation</h2></CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(CATEGORY_CONFIG).map(([key, conf]) => {
                const catBlocks = session.blocks.filter(b => b.category === key);
                const catMin = catBlocks.reduce((s, b) => s + b.planned_duration_min, 0);
                const pct = totalPlanned > 0 ? Math.round((catMin / totalPlanned) * 100) : 0;
                if (catMin === 0) return null;
                return (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    <span className="w-24 text-[var(--pf-text-secondary)]">{conf.label}</span>
                    <div className="flex-1 h-2 bg-[var(--pf-bg-hover)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: conf.color }} />
                    </div>
                    <span className="w-12 text-right text-xs text-[var(--pf-text-secondary)]">{catMin}m</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Progress */}
          <Card>
            <CardHeader><h2 className="text-sm font-semibold">Progress</h2></CardHeader>
            <CardContent>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[var(--pf-text-secondary)]">Blocks completed</span>
                <span className="font-medium">{session.blocks.filter(b => b.status === 'completed').length} / {session.blocks.length}</span>
              </div>
              <div className="w-full h-3 bg-[var(--pf-bg-hover)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(session.blocks.filter(b => b.status === 'completed').length / session.blocks.length) * 100}%`,
                    backgroundColor: 'var(--pf-status-ready)',
                    transitionDuration: 'var(--pf-animation-duration)',
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
