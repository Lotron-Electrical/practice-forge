import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  ArrowLeft,
  ArrowRight,
  LayoutDashboard,
  Music,
  Timer,
  Mic,
  BarChart3,
  FileMusic,
  Users,
  CalendarDays,
  ClipboardCheck,
  Target,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

interface TutorialStep {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  content: React.ReactNode;
}

const steps: TutorialStep[] = [
  {
    title: 'Welcome to Practice Forge',
    subtitle: 'Your AI-powered practice companion',
    icon: <Sparkles size={32} />,
    color: 'var(--pf-accent-gold)',
    content: (
      <div className="space-y-4">
        <p>Practice Forge helps musicians structure their practice, track progress, and prepare for auditions with intelligent tools built for serious players.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {[
            'AI-built practice sessions',
            'Repertoire & excerpt tracking',
            'Sheet music analysis',
            'Audio recording & feedback',
            'Progress analytics',
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
  {
    title: 'Dashboard',
    subtitle: 'Your daily practice hub',
    icon: <LayoutDashboard size={32} />,
    color: 'var(--pf-accent-gold)',
    content: (
      <div className="space-y-3">
        <p>The dashboard gives you an at-a-glance view of your practice life:</p>
        <ul className="space-y-2 text-sm text-[var(--pf-text-secondary)]">
          <li><strong className="text-[var(--pf-text-primary)]">Weekly stats</strong> -- hours practiced, sessions completed, current streak</li>
          <li><strong className="text-[var(--pf-text-primary)]">Active pieces</strong> -- see your repertoire with priority badges and target dates</li>
          <li><strong className="text-[var(--pf-text-primary)]">Excerpt rotation</strong> -- daily excerpts auto-selected for consistent review</li>
          <li><strong className="text-[var(--pf-text-primary)]">Audition countdown</strong> -- days remaining until upcoming auditions</li>
          <li><strong className="text-[var(--pf-text-primary)]">Quick log</strong> -- record practice time without a full session</li>
        </ul>
      </div>
    ),
  },
  {
    title: 'Practice Sessions',
    subtitle: 'Structured, timed, and intelligent',
    icon: <Timer size={32} />,
    color: 'var(--pf-status-in-progress)',
    content: (
      <div className="space-y-3">
        <p>Build structured sessions from 30 to 120 minutes. The AI allocates time across six categories:</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {['Warmup', 'Fundamentals', 'Technique', 'Repertoire', 'Excerpts', 'Buffer'].map(cat => (
            <div key={cat} className="px-3 py-2 rounded-pf-sm bg-[var(--pf-bg-hover)] text-[var(--pf-text-secondary)]">{cat}</div>
          ))}
        </div>
        <p className="text-sm text-[var(--pf-text-secondary)]">Each block has a countdown timer. Mark blocks done, skip, or restart. You can also record audio and use the built-in metronome without leaving the session.</p>
      </div>
    ),
  },
  {
    title: 'Repertoire',
    subtitle: 'Track every piece in detail',
    icon: <Music size={32} />,
    color: 'var(--pf-accent-lavender)',
    content: (
      <div className="space-y-3">
        <p>Add pieces with composer, difficulty, priority, and target dates. Break each piece into sections and track their status:</p>
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            { label: 'Not Started', color: 'var(--pf-text-secondary)' },
            { label: 'Working On', color: 'var(--pf-status-in-progress)' },
            { label: 'Solid', color: 'var(--pf-accent-gold)' },
            { label: 'Polished', color: 'var(--pf-status-ready)' },
          ].map(s => (
            <span key={s.label} className="px-2 py-1 rounded-pf-sm" style={{ backgroundColor: s.color, color: 'white', opacity: 0.9 }}>{s.label}</span>
          ))}
        </div>
        <p className="text-sm text-[var(--pf-text-secondary)]">Technical demands (scales, arpeggios, articulations) can be auto-detected from score analysis or added manually, then linked to targeted exercises.</p>
      </div>
    ),
  },
  {
    title: 'Excerpts & Auditions',
    subtitle: 'Audition prep, organised',
    icon: <Target size={32} />,
    color: 'var(--pf-accent-teal)',
    content: (
      <div className="space-y-3">
        <p>Track orchestral excerpts with status levels from <em>needs work</em> through to <em>audition ready</em>. The rotation system auto-selects excerpts each day so nothing goes stale.</p>
        <p className="text-sm text-[var(--pf-text-secondary)]">Create auditions with dates and link your required pieces and excerpts. The dashboard countdown keeps you focused as the date approaches.</p>
      </div>
    ),
  },
  {
    title: 'Score Analysis',
    subtitle: 'AI-powered sheet music insights',
    icon: <FileMusic size={32} />,
    color: 'var(--pf-accent-orange)',
    content: (
      <div className="space-y-3">
        <p>Upload a PDF score and let the AI analyse it. You get:</p>
        <ul className="space-y-1 text-sm text-[var(--pf-text-secondary)]">
          <li>Key, time signature, tempo, and difficulty estimate</li>
          <li>Pattern detection -- scales, arpeggios, intervals, articulations</li>
          <li>Instrument-specific insights (breathing points, alternate fingerings)</li>
          <li>Auto-extracted technical demands you can link to exercises</li>
        </ul>
        <p className="text-sm text-[var(--pf-text-secondary)]">View the score with highlighted patterns and difficulty regions.</p>
      </div>
    ),
  },
  {
    title: 'Recording & Analysis',
    subtitle: 'Listen back, improve faster',
    icon: <Mic size={32} />,
    color: 'var(--pf-status-needs-work)',
    content: (
      <div className="space-y-3">
        <p>Record audio during practice sessions or standalone. The app analyses your recordings for:</p>
        <ul className="space-y-1 text-sm text-[var(--pf-text-secondary)]">
          <li>Pitch accuracy with intonation trace</li>
          <li>Rhythm accuracy</li>
          <li>Dynamics and spectral analysis</li>
          <li>Bar-level scoring to pinpoint problem spots</li>
        </ul>
      </div>
    ),
  },
  {
    title: 'Analytics & Progress',
    subtitle: 'See how far you have come',
    icon: <BarChart3 size={32} />,
    color: 'var(--pf-status-ready)',
    content: (
      <div className="space-y-3">
        <p>Track your practice habits over time with charts and stats:</p>
        <ul className="space-y-1 text-sm text-[var(--pf-text-secondary)]">
          <li>Daily/weekly time distribution</li>
          <li>Session history with ratings</li>
          <li>Practice streaks and milestones</li>
          <li>Drift alerts when your actual practice diverges from planned allocation</li>
        </ul>
        <p className="text-sm text-[var(--pf-text-secondary)]">The calendar view shows your practice at a glance across weeks and months.</p>
      </div>
    ),
  },
  {
    title: 'Assessments',
    subtitle: 'Evaluate your readiness',
    icon: <ClipboardCheck size={32} />,
    color: 'var(--pf-accent-lavender)',
    content: (
      <div className="space-y-3">
        <p>Run structured evaluations on your repertoire:</p>
        <ul className="space-y-1 text-sm text-[var(--pf-text-secondary)]">
          <li><strong className="text-[var(--pf-text-primary)]">Piece audits</strong> -- comprehensive readiness evaluation</li>
          <li><strong className="text-[var(--pf-text-primary)]">Spot checks</strong> -- quick excerpt assessments</li>
          <li><strong className="text-[var(--pf-text-primary)]">Weekly reviews</strong> -- aggregate stats and progress summary</li>
        </ul>
        <p className="text-sm text-[var(--pf-text-secondary)]">Each assessment rates sections from needs work to excellent, with bar-level detail from recording analysis.</p>
      </div>
    ),
  },
  {
    title: 'Community',
    subtitle: 'Practice together',
    icon: <Users size={32} />,
    color: 'var(--pf-accent-teal)',
    content: (
      <div className="space-y-3">
        <p>Join challenges, follow other musicians, and earn achievements:</p>
        <ul className="space-y-1 text-sm text-[var(--pf-text-secondary)]">
          <li>Excerpt duels, scale sprints, practice marathons</li>
          <li>Leaderboards and challenge results</li>
          <li>Shared excerpt library with community notes and difficulty ratings</li>
          <li>Custom UI themes you can create and share</li>
          <li>Achievement badges for milestones</li>
        </ul>
      </div>
    ),
  },
  {
    title: 'Ready to start?',
    subtitle: 'Create an account and shape your sound',
    icon: <CalendarDays size={32} />,
    color: 'var(--pf-accent-gold)',
    content: (
      <div className="space-y-4">
        <p>That is everything you need to know to get started. Here is a suggested first session:</p>
        <ol className="space-y-2 text-sm text-[var(--pf-text-secondary)] list-decimal list-inside">
          <li>Create your account and set your instrument and level</li>
          <li>Add a piece you are currently working on</li>
          <li>Break it into sections and set a target date</li>
          <li>Start a practice session -- the AI will build a plan for you</li>
          <li>After practicing, check your dashboard for stats and streaks</li>
        </ol>
      </div>
    ),
  },
];

export function TutorialPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  return (
    <div className="min-h-screen bg-[var(--pf-bg-primary)] p-4">
      <div className="max-w-lg mx-auto pt-8">
        {/* Brand */}
        <div className="text-center mb-6">
          <div className="flex flex-col items-center leading-tight">
            <span className="text-[var(--pf-text-primary)] font-heading font-bold text-2xl tracking-tight">PRACTICE</span>
            <span className="font-heading font-bold text-2xl tracking-tight" style={{ color: 'var(--pf-accent-gold)' }}>FORGE</span>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-6">
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
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-pf flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: step.color, color: 'white', opacity: 0.9 }}
              >
                {step.icon}
              </div>
              <div>
                <h2 className="text-lg font-heading font-bold text-[var(--pf-text-primary)]">{step.title}</h2>
                <p className="text-sm text-[var(--pf-text-secondary)]">{step.subtitle}</p>
              </div>
            </div>

            {/* Step body */}
            <div className="text-sm text-[var(--pf-text-primary)] leading-relaxed">
              {step.content}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
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
            <Button size="sm" onClick={() => navigate('/login')}>
              Get Started <ArrowRight size={16} />
            </Button>
          ) : (
            <Button size="sm" onClick={() => setCurrentStep(s => s + 1)}>
              Next <ArrowRight size={16} />
            </Button>
          )}
        </div>

        {/* Skip link */}
        <div className="text-center mt-4">
          <button
            onClick={() => navigate('/login')}
            className="text-xs text-[var(--pf-text-secondary)] hover:text-[var(--pf-text-primary)] transition-colors underline"
          >
            Skip to sign in
          </button>
        </div>
      </div>
    </div>
  );
}
