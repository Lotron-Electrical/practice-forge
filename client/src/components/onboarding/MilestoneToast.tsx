import { useEffect, useState } from 'react';
import { Music, Flame, Trophy, Star } from 'lucide-react';

interface Milestone {
  key: string;
  icon: typeof Music;
  color: string;
  title: string;
  message: string;
}

const MILESTONES: Milestone[] = [
  { key: 'first-piece', icon: Music, color: 'var(--pf-accent-gold)', title: 'First piece added!', message: 'Your repertoire has begun. Now try starting a practice session.' },
  { key: 'first-session', icon: Star, color: 'var(--pf-accent-teal)', title: 'First session complete!', message: 'Great start. Come back tomorrow to build your streak.' },
  { key: 'streak-3', icon: Flame, color: 'var(--pf-accent-gold)', title: '3-day streak!', message: "Consistency is everything. You're building a habit." },
  { key: 'streak-7', icon: Trophy, color: 'var(--pf-accent-lavender)', title: '7-day streak!', message: "A full week of practice. That's serious commitment." },
];

function getDismissedMilestones(): Set<string> {
  try {
    const stored = localStorage.getItem('pf-milestones-dismissed');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function dismissMilestone(key: string) {
  const dismissed = getDismissedMilestones();
  dismissed.add(key);
  try {
    localStorage.setItem('pf-milestones-dismissed', JSON.stringify([...dismissed]));
  } catch {}
}

interface MilestoneToastProps {
  activePieces: number;
  totalSessions: number;
  streak: number;
}

export function MilestoneToast({ activePieces, totalSessions, streak }: MilestoneToastProps) {
  const [visible, setVisible] = useState<Milestone | null>(null);
  const [dismissed] = useState(getDismissedMilestones);

  useEffect(() => {
    // Check milestones in priority order (show only one at a time)
    const checks: [string, boolean][] = [
      ['streak-7', streak >= 7],
      ['streak-3', streak >= 3],
      ['first-session', totalSessions >= 1],
      ['first-piece', activePieces >= 1],
    ];

    for (const [key, met] of checks) {
      if (met && !dismissed.has(key)) {
        const milestone = MILESTONES.find(m => m.key === key);
        if (milestone) {
          setVisible(milestone);
          return;
        }
      }
    }
  }, [activePieces, totalSessions, streak, dismissed]);

  if (!visible) return null;

  const Icon = visible.icon;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 max-w-sm animate-[slideUp_0.3s_ease-out] rounded-pf border border-[var(--pf-border-color)] bg-[var(--pf-bg-secondary)] shadow-pf-lg p-4"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `color-mix(in srgb, ${visible.color} 15%, transparent)` }}
        >
          <Icon size={20} style={{ color: visible.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{visible.title}</p>
          <p className="text-xs text-[var(--pf-text-secondary)] mt-0.5">{visible.message}</p>
        </div>
        <button
          onClick={() => {
            dismissMilestone(visible.key);
            setVisible(null);
          }}
          className="text-[var(--pf-text-secondary)] hover:text-[var(--pf-text-primary)] text-xs font-medium flex-shrink-0"
        >
          Got it
        </button>
      </div>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(1rem); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
