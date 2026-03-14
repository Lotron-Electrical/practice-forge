import { useState } from 'react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react';

interface HistorySession {
  id: string;
  date: string;
  planned_duration_min: number;
  actual_duration_min: number | null;
  rating: string | null;
  notes: string;
  blocks_total: number;
  blocks_completed: number;
}

interface HistoryData {
  sessions: HistorySession[];
  total: number;
  page: number;
  totalPages: number;
}

const RATING_COLORS: Record<string, string> = {
  good: 'var(--pf-status-ready)',
  okay: 'var(--pf-accent-gold)',
  bad: 'var(--pf-status-needs-work)',
};

export function SessionHistoryList({ data, onPageChange }: { data: HistoryData; onPageChange: (page: number) => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (data.sessions.length === 0) {
    return <p className="text-sm text-[var(--pf-text-secondary)] text-center py-8">No completed sessions yet.</p>;
  }

  return (
    <div>
      <div className="space-y-1">
        {data.sessions.map(s => {
          const isExpanded = expanded === s.id;
          const duration = s.actual_duration_min || s.planned_duration_min;
          const dateStr = new Date(s.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

          return (
            <div key={s.id}>
              <button
                onClick={() => setExpanded(isExpanded ? null : s.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-pf-sm hover:bg-[var(--pf-bg-hover)] transition-colors text-left"
              >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span className="text-sm font-medium w-20 sm:w-28 shrink-0">{dateStr}</span>
                <span className="text-sm text-[var(--pf-text-secondary)] w-10 sm:w-16 shrink-0">{duration}m</span>
                {s.rating && <Badge color={RATING_COLORS[s.rating]}>{s.rating}</Badge>}
                <span className="text-xs text-[var(--pf-text-secondary)] ml-auto">
                  {s.blocks_completed}/{s.blocks_total} blocks
                </span>
              </button>
              {isExpanded && s.notes && (
                <div className="ml-10 px-3 pb-2 text-xs text-[var(--pf-text-secondary)] italic">
                  "{s.notes}"
                </div>
              )}
            </div>
          );
        })}
      </div>

      {data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4 pt-3 border-t border-[var(--pf-border-color)]">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onPageChange(data.page - 1)}
            disabled={data.page <= 1}
          >
            <ChevronLeft size={14} /> Prev
          </Button>
          <span className="text-xs text-[var(--pf-text-secondary)]">
            Page {data.page} of {data.totalPages}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onPageChange(data.page + 1)}
            disabled={data.page >= data.totalPages}
          >
            Next <ChevronRight size={14} />
          </Button>
        </div>
      )}
    </div>
  );
}
