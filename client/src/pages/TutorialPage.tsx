import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../auth/AuthContext';
import {
  ArrowLeft,
  ArrowRight,
  X,
  LayoutDashboard,
  Music,
  Timer,
  Mic,
  BarChart3,
  FileMusic,
  Users,
  CalendarDays,
  Sparkles,
  ChevronRight,
  Target,
  Flame,
  Clock,
  TrendingUp,
  Play,
  Pause,
  SkipForward,
  CheckCircle2,
  Circle,
  GraduationCap,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Mini-mockup components — stylised previews of real app screens     */
/* ------------------------------------------------------------------ */

function MockDashboard() {
  return (
    <div className="mt-4 rounded-[var(--pf-radius-md)] border border-[var(--pf-border-color)] bg-[var(--pf-bg-secondary)] p-3 text-xs overflow-hidden">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: 'This week', value: '4h 20m', icon: <Clock size={12} /> },
          { label: 'Streak', value: '12 days', icon: <Flame size={12} /> },
          { label: 'Sessions', value: '6', icon: <TrendingUp size={12} /> },
        ].map(s => (
          <div key={s.label} className="bg-[var(--pf-bg-card)] rounded-[var(--pf-radius-sm)] p-2 text-center border border-[var(--pf-border-color)]">
            <div className="flex items-center justify-center gap-1 text-[var(--pf-text-secondary)] mb-1">{s.icon} {s.label}</div>
            <div className="font-bold text-[var(--pf-text-primary)]">{s.value}</div>
          </div>
        ))}
      </div>
      {/* Active pieces preview */}
      <div className="space-y-1.5">
        <div className="text-[10px] font-medium text-[var(--pf-text-secondary)] uppercase tracking-wide">Active pieces</div>
        {[
          { name: 'Mozart Concerto No. 1', status: 'Working On', color: 'var(--pf-status-in-progress)' },
          { name: 'Autumn Leaves (arr.)', status: 'Solid', color: 'var(--pf-accent-gold)' },
        ].map(p => (
          <div key={p.name} className="flex items-center justify-between bg-[var(--pf-bg-card)] rounded-[var(--pf-radius-sm)] px-2 py-1.5 border border-[var(--pf-border-color)]">
            <span className="text-[var(--pf-text-primary)] truncate">{p.name}</span>
            <span className="px-1.5 py-0.5 rounded-[var(--pf-radius-sm)] text-[10px] text-white flex-shrink-0" style={{ backgroundColor: p.color }}>{p.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockSessionTimer() {
  const [running, setRunning] = useState(false);

  return (
    <div className="mt-4 rounded-[var(--pf-radius-md)] border border-[var(--pf-border-color)] bg-[var(--pf-bg-secondary)] p-3 text-xs overflow-hidden">
      {/* Current block */}
      <div className="text-center mb-3">
        <div className="text-[10px] font-medium text-[var(--pf-text-secondary)] uppercase tracking-wide mb-1">Current block</div>
        <div className="text-sm font-bold text-[var(--pf-text-primary)]">Warmup</div>
        <div className="font-mono text-2xl font-bold mt-1" style={{ color: 'var(--pf-accent-gold)' }}>
          {running ? '09:47' : '10:00'}
        </div>
      </div>
      {/* Controls */}
      <div className="flex items-center justify-center gap-3 mb-3">
        <button
          onClick={() => setRunning(r => !r)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white transition-transform hover:scale-110"
          style={{ backgroundColor: running ? 'var(--pf-status-needs-work)' : 'var(--pf-status-ready)' }}
        >
          {running ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--pf-bg-hover)] text-[var(--pf-text-secondary)]">
          <SkipForward size={14} />
        </button>
      </div>
      {/* Block list */}
      <div className="space-y-1">
        {[
          { name: 'Warmup', time: '10 min', active: true },
          { name: 'Technique', time: '15 min', active: false },
          { name: 'Repertoire', time: '20 min', active: false },
        ].map(b => (
          <div key={b.name} className={`flex items-center justify-between px-2 py-1 rounded-[var(--pf-radius-sm)] ${b.active ? 'bg-[var(--pf-bg-active)] border border-[var(--pf-border-color)]' : ''}`}>
            <span className={b.active ? 'text-[var(--pf-text-primary)] font-medium' : 'text-[var(--pf-text-secondary)]'}>{b.name}</span>
            <span className="text-[var(--pf-text-secondary)]">{b.time}</span>
          </div>
        ))}
      </div>
      <p className="text-center text-[10px] text-[var(--pf-text-secondary)] mt-2 italic">Try it — tap play</p>
    </div>
  );
}

function MockPieceCard() {
  return (
    <div className="mt-4 rounded-[var(--pf-radius-md)] border border-[var(--pf-border-color)] bg-[var(--pf-bg-secondary)] p-3 text-xs overflow-hidden">
      {/* Piece header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-sm font-bold text-[var(--pf-text-primary)]">Brahms Symphony No. 4</div>
          <div className="text-[var(--pf-text-secondary)]">Exposition — bars 1-58</div>
        </div>
        <span className="px-1.5 py-0.5 rounded-[var(--pf-radius-sm)] text-[10px] text-white flex-shrink-0" style={{ backgroundColor: 'var(--pf-status-in-progress)' }}>Working On</span>
      </div>
      {/* Section progress */}
      <div className="space-y-1.5 mb-2">
        {[
          { name: 'Opening theme', pct: 80, color: 'var(--pf-accent-gold)' },
          { name: 'Transition', pct: 40, color: 'var(--pf-status-in-progress)' },
          { name: 'Second theme', pct: 15, color: 'var(--pf-status-needs-work)' },
        ].map(s => (
          <div key={s.name}>
            <div className="flex justify-between text-[10px] mb-0.5">
              <span className="text-[var(--pf-text-primary)]">{s.name}</span>
              <span className="text-[var(--pf-text-secondary)]">{s.pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--pf-bg-hover)]">
              <div className="h-full rounded-full transition-all" style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
            </div>
          </div>
        ))}
      </div>
      {/* Audition countdown */}
      <div className="flex items-center gap-1.5 text-[10px] pt-1.5 border-t border-[var(--pf-border-color)]">
        <Target size={10} style={{ color: 'var(--pf-accent-teal)' }} />
        <span className="text-[var(--pf-text-secondary)]">Audition in <strong className="text-[var(--pf-text-primary)]">23 days</strong></span>
      </div>
    </div>
  );
}

function MockAnalysis() {
  return (
    <div className="mt-4 rounded-[var(--pf-radius-md)] border border-[var(--pf-border-color)] bg-[var(--pf-bg-secondary)] p-3 text-xs overflow-hidden">
      {/* Score info */}
      <div className="flex items-center gap-2 mb-2">
        <FileMusic size={14} style={{ color: 'var(--pf-accent-orange)' }} />
        <span className="font-bold text-[var(--pf-text-primary)]">Debussy — Syrinx</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {[
          { label: 'Key', value: 'Bb minor' },
          { label: 'Tempo', value: 'Tres modere' },
          { label: 'Difficulty', value: 'Advanced' },
          { label: 'Patterns', value: '14 found' },
        ].map(d => (
          <div key={d.label} className="bg-[var(--pf-bg-card)] rounded-[var(--pf-radius-sm)] px-2 py-1 border border-[var(--pf-border-color)]">
            <div className="text-[10px] text-[var(--pf-text-secondary)]">{d.label}</div>
            <div className="text-[var(--pf-text-primary)] font-medium">{d.value}</div>
          </div>
        ))}
      </div>
      {/* Recording bars */}
      <div className="text-[10px] font-medium text-[var(--pf-text-secondary)] uppercase tracking-wide mb-1.5">Recording — bar accuracy</div>
      <div className="flex gap-0.5 items-end h-8">
        {[85, 92, 78, 95, 60, 88, 91, 70, 83, 96, 55, 90, 87, 93, 72, 89].map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm transition-all"
            style={{
              height: `${v}%`,
              backgroundColor: v >= 85 ? 'var(--pf-status-ready)' : v >= 70 ? 'var(--pf-accent-gold)' : 'var(--pf-status-needs-work)',
              opacity: 0.8,
            }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-[var(--pf-text-secondary)] mt-0.5">
        <span>Bar 1</span>
        <span>Bar 16</span>
      </div>
    </div>
  );
}

function MockAnalytics() {
  return (
    <div className="mt-4 rounded-[var(--pf-radius-md)] border border-[var(--pf-border-color)] bg-[var(--pf-bg-secondary)] p-3 text-xs overflow-hidden">
      {/* Weekly chart */}
      <div className="text-[10px] font-medium text-[var(--pf-text-secondary)] uppercase tracking-wide mb-2">This week</div>
      <div className="flex items-end gap-1 h-12 mb-1">
        {[
          { day: 'M', mins: 45 },
          { day: 'T', mins: 60 },
          { day: 'W', mins: 30 },
          { day: 'T', mins: 75 },
          { day: 'F', mins: 50 },
          { day: 'S', mins: 0 },
          { day: 'S', mins: 20 },
        ].map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            <div
              className="w-full rounded-t-sm"
              style={{
                height: `${(d.mins / 75) * 100}%`,
                minHeight: d.mins > 0 ? '4px' : '1px',
                backgroundColor: d.mins > 0 ? 'var(--pf-accent-gold)' : 'var(--pf-bg-hover)',
                opacity: 0.85,
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1 mb-3">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={i} className="flex-1 text-center text-[10px] text-[var(--pf-text-secondary)]">{d}</div>
        ))}
      </div>
      {/* Assessment summary */}
      <div className="flex items-center gap-2 pt-2 border-t border-[var(--pf-border-color)]">
        <CheckCircle2 size={12} style={{ color: 'var(--pf-status-ready)' }} />
        <span className="text-[var(--pf-text-primary)]">Piece audit: <strong>Solid</strong> — 3 sections improved this week</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tutorial steps                                                     */
/* ------------------------------------------------------------------ */

interface TutorialStep {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  content: React.ReactNode;
}

const steps: TutorialStep[] = [
  // Step 1 — Welcome
  {
    title: 'Welcome to Practice Forge',
    subtitle: 'Your AI-powered practice companion',
    icon: <Sparkles size={32} />,
    color: 'var(--pf-accent-gold)',
    content: (
      <div className="space-y-4">
        <p>Practice Forge helps musicians structure their practice, track progress, and prepare for performances — whether you play classical, jazz, or anything in between.</p>
        <div className="rounded-[var(--pf-radius-md)] border border-[var(--pf-border-color)] bg-[var(--pf-bg-secondary)] px-3 py-2.5 text-sm">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={14} style={{ color: 'var(--pf-accent-gold)' }} />
            <span className="font-medium text-[var(--pf-text-primary)]">Adapts to you</span>
          </div>
          <p className="text-[var(--pf-text-secondary)] text-xs">Tell us your instrument, genre, and level. Practice Forge tailors sessions, analysis, and exercises to how you play.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            'AI-built practice sessions',
            'Repertoire & progress tracking',
            'Sheet music analysis',
            'Audio recording & feedback',
            'Progress analytics & goals',
            'Community challenges',
          ].map(feature => (
            <div key={feature} className="flex items-center gap-2 text-sm text-[var(--pf-text-secondary)]">
              <ChevronRight size={14} style={{ color: 'var(--pf-accent-gold)', flexShrink: 0 }} />
              {feature}
            </div>
          ))}
        </div>
      </div>
    ),
  },
  // Step 2 — Dashboard
  {
    title: 'Dashboard',
    subtitle: 'Your daily practice hub',
    icon: <LayoutDashboard size={32} />,
    color: 'var(--pf-accent-gold)',
    content: (
      <div className="space-y-3">
        <p>Everything you need at a glance — weekly stats, active pieces, practice streaks, and upcoming deadlines.</p>
        <MockDashboard />
      </div>
    ),
  },
  // Step 3 — Practice Sessions
  {
    title: 'Practice Sessions',
    subtitle: 'Structured, timed, and flexible',
    icon: <Timer size={32} />,
    color: 'var(--pf-status-in-progress)',
    content: (
      <div className="space-y-3">
        <p>Set a duration and the AI suggests a plan — or build your own from scratch. Adjust any block, skip what you do not need, add what you do.</p>
        <div className="grid grid-cols-3 gap-1.5 text-xs">
          {['Warmup', 'Fundamentals', 'Technique', 'Repertoire', 'Excerpts', 'Sight-reading'].map(cat => (
            <div key={cat} className="px-2 py-1.5 rounded-[var(--pf-radius-sm)] bg-[var(--pf-bg-hover)] text-[var(--pf-text-secondary)] text-center">{cat}</div>
          ))}
        </div>
        <p className="text-sm text-[var(--pf-text-secondary)]">Built-in metronome and recording — no need to leave the session.</p>
        <MockSessionTimer />
      </div>
    ),
  },
  // Step 4 — Your Music (merged Repertoire + Excerpts & Auditions)
  {
    title: 'Your Music',
    subtitle: 'Repertoire, excerpts, and audition prep',
    icon: <Music size={32} />,
    color: 'var(--pf-accent-lavender)',
    content: (
      <div className="space-y-3">
        <p>Add pieces with composer, difficulty, and target dates. Break each into sections and track their status from first read-through to performance-ready.</p>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {[
            { label: 'Not Started', color: 'var(--pf-text-secondary)' },
            { label: 'Working On', color: 'var(--pf-status-in-progress)' },
            { label: 'Solid', color: 'var(--pf-accent-gold)' },
            { label: 'Polished', color: 'var(--pf-status-ready)' },
          ].map(s => (
            <span key={s.label} className="px-2 py-1 rounded-[var(--pf-radius-sm)]" style={{ backgroundColor: s.color, color: 'white', opacity: 0.9 }}>{s.label}</span>
          ))}
        </div>
        <p className="text-sm text-[var(--pf-text-secondary)]">Preparing for an audition or recital? Link your required pieces and excerpts, set the date, and the app auto-selects daily rotation so nothing goes stale.</p>
        <MockPieceCard />
      </div>
    ),
  },
  // Step 5 — Score & Audio Intelligence (merged Score Analysis + Recording)
  {
    title: 'Score & Audio Intelligence',
    subtitle: 'See the music, hear yourself clearly',
    icon: <FileMusic size={32} />,
    color: 'var(--pf-accent-orange)',
    content: (
      <div className="space-y-3">
        <p>Upload a PDF score and the AI analyses it — key, tempo, difficulty, and detected patterns like scales, arpeggios, and articulations. Get instrument-specific insights (breathing points, alternate fingerings, bowing suggestions).</p>
        <p className="text-sm text-[var(--pf-text-secondary)]">Record yourself during practice and get bar-level feedback on pitch accuracy, rhythm, and dynamics. Pinpoint exactly which bars need work.</p>
        <MockAnalysis />
      </div>
    ),
  },
  // Step 6 — Track Your Progress (merged Analytics + Assessments)
  {
    title: 'Track Your Progress',
    subtitle: 'Stats, assessments, and honest feedback',
    icon: <BarChart3 size={32} />,
    color: 'var(--pf-status-ready)',
    content: (
      <div className="space-y-3">
        <p>See how your practice time breaks down across days and categories. Spot trends, maintain streaks, and get alerts when your actual practice drifts from your plan.</p>
        <p className="text-sm text-[var(--pf-text-secondary)]">Run piece audits and spot-checks to evaluate readiness before a performance. Weekly reviews summarise what improved and what still needs attention.</p>
        <MockAnalytics />
      </div>
    ),
  },
  // Step 7 — Community
  {
    title: 'Community',
    subtitle: 'Practice together, grow together',
    icon: <Users size={32} />,
    color: 'var(--pf-accent-teal)',
    content: (
      <div className="space-y-3">
        <p>Join challenges, follow other musicians, and earn achievement badges:</p>
        <ul className="space-y-1.5 text-sm text-[var(--pf-text-secondary)]">
          <li className="flex items-start gap-2"><ChevronRight size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--pf-accent-teal)' }} />Scale sprints, excerpt duels, practice marathons</li>
          <li className="flex items-start gap-2"><ChevronRight size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--pf-accent-teal)' }} />Leaderboards and shared excerpt library with community notes</li>
          <li className="flex items-start gap-2"><ChevronRight size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--pf-accent-teal)' }} />Custom UI themes you can create and share</li>
        </ul>
        <div className="rounded-[var(--pf-radius-md)] border border-[var(--pf-border-color)] bg-[var(--pf-bg-secondary)] px-3 py-2.5 text-sm">
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap size={14} style={{ color: 'var(--pf-accent-teal)' }} />
            <span className="font-medium text-[var(--pf-text-primary)]">For teachers</span>
          </div>
          <p className="text-[var(--pf-text-secondary)] text-xs">A studio dashboard is on the way — track student progress, assign repertoire, and set challenges for your class. Coming soon.</p>
        </div>
      </div>
    ),
  },
  // Step 8 — Ready to start?
  {
    title: 'Ready to start?',
    subtitle: 'Create an account and shape your sound',
    icon: <CalendarDays size={32} />,
    color: 'var(--pf-accent-gold)',
    content: (
      <div className="space-y-4">
        <p>Here is a suggested first session — it takes about five minutes to set up:</p>
        <ol className="space-y-2.5 text-sm text-[var(--pf-text-secondary)]">
          {[
            'Create your account and set your instrument, genre, and level',
            'Add a piece you are currently working on',
            'Break it into sections and set a target date',
            'Start a practice session — the AI builds a plan you can adjust',
            'After practising, check your dashboard for stats and streaks',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: 'var(--pf-accent-gold)' }}>{i + 1}</span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
        <p className="text-sm text-[var(--pf-text-secondary)]">Free to use. No credit card required.</p>
      </div>
    ),
  },
];

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export function TutorialPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  // When accessed from inside the app (authenticated), we're embedded in MainLayout
  const isEmbedded = isAuthenticated;

  return (
    <div className={`${isEmbedded ? '' : 'min-h-screen bg-[var(--pf-bg-primary)]'} p-4`}>
      <div className={`max-w-lg mx-auto ${isEmbedded ? 'pt-0' : 'pt-8'}`}>
        {/* Close button when inside the app */}
        {isEmbedded && (
          <div className="flex justify-end mb-2">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -mr-2 rounded-[var(--pf-radius-sm)] text-[var(--pf-text-secondary)] hover:text-[var(--pf-text-primary)] hover:bg-[var(--pf-bg-hover)] transition-colors"
              aria-label="Close tutorial"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* Brand — only show when standalone */}
        {!isEmbedded && (
          <div className="text-center mb-6">
            <div className="flex flex-col items-center leading-tight">
              <span className="text-[var(--pf-text-primary)] font-heading font-bold text-2xl tracking-tight">PRACTICE</span>
              <span className="font-heading font-bold text-2xl tracking-tight" style={{ color: 'var(--pf-accent-gold)' }}>FORGE</span>
            </div>
          </div>
        )}

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-4">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className="w-2 h-2 rounded-full transition-all"
              style={{
                backgroundColor: i === currentStep ? 'var(--pf-accent-gold)' : 'var(--pf-border-color)',
                transform: i === currentStep ? 'scale(1.3)' : 'scale(1)',
              }}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        {/* Content card */}
        <Card>
          <CardContent>
            {/* Step header */}
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-[var(--pf-radius-md)] flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: step.color, color: 'white', opacity: 0.9 }}
              >
                {step.icon}
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-heading font-bold text-[var(--pf-text-primary)]">{step.title}</h2>
                <p className="text-xs sm:text-sm text-[var(--pf-text-secondary)]">{step.subtitle}</p>
              </div>
            </div>

            {/* Step body */}
            <div className="text-sm text-[var(--pf-text-primary)] leading-relaxed">
              {step.content}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentStep(s => s - 1)}
            disabled={isFirst}
          >
            <ArrowLeft size={16} /> Back
          </Button>

          <span className="text-xs text-[var(--pf-text-secondary)]">
            {currentStep + 1} / {steps.length}
          </span>

          {isLast ? (
            <Button size="sm" onClick={() => isEmbedded ? navigate(-1) : navigate('/login')}>
              {isEmbedded ? 'Done' : 'Get Started'} {isEmbedded ? <CheckCircle2 size={16} /> : <ArrowRight size={16} />}
            </Button>
          ) : (
            <Button size="sm" onClick={() => setCurrentStep(s => s + 1)}>
              Next <ArrowRight size={16} />
            </Button>
          )}
        </div>

        {/* Skip link — only when standalone */}
        {!isEmbedded && (
          <div className="text-center mt-4">
            <button
              onClick={() => navigate('/login')}
              className="text-xs text-[var(--pf-text-secondary)] hover:text-[var(--pf-text-primary)] transition-colors underline"
            >
              Skip to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
