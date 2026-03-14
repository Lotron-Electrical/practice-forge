import { ThumbsUp, Meh, ThumbsDown, TrendingUp, TrendingDown } from 'lucide-react';

interface TrendsData {
  current: {
    totalHours: number;
    sessionCount: number;
    avgLength: number;
    completionRate: number;
  };
  previous: {
    totalHours: number;
    sessionCount: number;
    avgLength: number;
  };
  ratings: { good: number; okay: number; bad: number };
}

function ComparisonBadge({ current, previous, unit = '' }: { current: number; previous: number; unit?: string }) {
  const diff = current - previous;
  if (diff === 0 || previous === 0) return null;
  const positive = diff > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${positive ? 'text-[var(--pf-status-ready)]' : 'text-[var(--pf-status-needs-work)]'}`}>
      {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {positive ? '+' : ''}{diff.toFixed(1)}{unit}
    </span>
  );
}

export function PeriodSummary({ data }: { data: TrendsData }) {
  const { current, previous, ratings } = data;
  const totalRatings = ratings.good + ratings.okay + ratings.bad;

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-3xl font-bold">{current.totalHours}<span className="text-sm font-normal text-[var(--pf-text-secondary)]">h</span></div>
          <div className="text-xs text-[var(--pf-text-secondary)]">Total practice</div>
          <ComparisonBadge current={current.totalHours} previous={previous.totalHours} unit="h" />
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold">{current.sessionCount}</div>
          <div className="text-xs text-[var(--pf-text-secondary)]">Sessions</div>
          <ComparisonBadge current={current.sessionCount} previous={previous.sessionCount} />
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold">{current.avgLength}<span className="text-sm font-normal text-[var(--pf-text-secondary)]">m</span></div>
          <div className="text-xs text-[var(--pf-text-secondary)]">Avg length</div>
          <ComparisonBadge current={current.avgLength} previous={previous.avgLength} unit="m" />
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold">{current.completionRate}<span className="text-sm font-normal text-[var(--pf-text-secondary)]">%</span></div>
          <div className="text-xs text-[var(--pf-text-secondary)]">Completion rate</div>
        </div>
      </div>

      {totalRatings > 0 && (
        <div className="flex items-center justify-center gap-6 pt-4 border-t border-[var(--pf-border-color)]">
          {[
            { key: 'good', icon: ThumbsUp, color: 'var(--pf-status-ready)', count: ratings.good },
            { key: 'okay', icon: Meh, color: 'var(--pf-accent-gold)', count: ratings.okay },
            { key: 'bad', icon: ThumbsDown, color: 'var(--pf-status-needs-work)', count: ratings.bad },
          ].map(({ key, icon: Icon, color, count }) => (
            <div key={key} className="flex items-center gap-1.5 text-sm">
              <Icon size={16} style={{ color }} />
              <span className="font-medium">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
