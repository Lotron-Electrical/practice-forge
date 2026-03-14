import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { api } from '../api/client';
import { PeriodSummary } from '../components/analytics/PeriodSummary';
import { TimeDistributionChart } from '../components/analytics/TimeDistributionChart';
import { DriftChart } from '../components/analytics/DriftChart';
import { SessionHistoryList } from '../components/analytics/SessionHistoryList';
import { AlertTriangle, Clock } from 'lucide-react';

export function AnalyticsPage() {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [trends, setTrends] = useState<any>(null);
  const [timeData, setTimeData] = useState<any>(null);
  const [drift, setDrift] = useState<any>(null);
  const [stalled, setStalled] = useState<any[]>([]);
  const [history, setHistory] = useState<any>(null);
  const [historyPage, setHistoryPage] = useState(1);

  useEffect(() => {
    api.getAnalyticsTrends(period).then(d => setTrends(d)).catch(() => {});
    api.getAnalyticsTimeByCategory(period).then(d => setTimeData(d)).catch(() => {});
  }, [period]);

  useEffect(() => {
    api.getAnalyticsDrift().then(d => setDrift(d)).catch(() => {});
    api.getAnalyticsStalledPieces().then(d => setStalled(d as any[])).catch(() => {});
  }, []);

  useEffect(() => {
    api.getSessionHistory({ page: historyPage }).then(d => setHistory(d)).catch(() => {});
  }, [historyPage]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="flex gap-1 bg-[var(--pf-bg-secondary)] rounded-pf p-0.5">
          {(['week', 'month'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-pf-sm text-xs font-medium transition-colors ${
                period === p
                  ? 'bg-[var(--pf-bg-primary)] text-[var(--pf-text-primary)] shadow-sm'
                  : 'text-[var(--pf-text-secondary)] hover:text-[var(--pf-text-primary)]'
              }`}
            >
              {p === 'week' ? 'Week' : 'Month'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {/* Period Summary */}
        {trends && (
          <Card>
            <CardHeader><h2 className="text-base font-semibold">Period Summary</h2></CardHeader>
            <CardContent>
              <PeriodSummary data={trends} />
            </CardContent>
          </Card>
        )}

        {/* Time Distribution */}
        <Card>
          <CardHeader><h2 className="text-base font-semibold">Time Distribution</h2></CardHeader>
          <CardContent>
            <TimeDistributionChart data={timeData?.weeks || []} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Allocation Drift */}
          {drift && (
            <Card>
              <CardHeader><h2 className="text-base font-semibold">Planned vs Actual</h2></CardHeader>
              <CardContent>
                <DriftChart data={drift} />
              </CardContent>
            </Card>
          )}

          {/* Stalled Pieces */}
          <Card>
            <CardHeader><h2 className="text-base font-semibold">Needs Attention</h2></CardHeader>
            <CardContent>
              {stalled.length === 0 ? (
                <p className="text-sm text-[var(--pf-text-secondary)] text-center py-6">All pieces are progressing nicely.</p>
              ) : (
                <div className="space-y-3">
                  {stalled.map((s: any) => (
                    <Link
                      key={s.piece_id}
                      to={`/pieces/${s.piece_id}`}
                      className="flex items-start gap-3 p-2 rounded-pf-sm hover:bg-[var(--pf-bg-hover)] transition-colors"
                    >
                      <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--pf-accent-gold)' }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{s.title}</div>
                        <div className="text-xs text-[var(--pf-text-secondary)]">
                          {s.composer && `${s.composer} — `}{s.total_minutes}m invested, {s.days_since_change}d since progress
                        </div>
                      </div>
                      <Clock size={14} className="flex-shrink-0 mt-0.5 text-[var(--pf-text-secondary)]" />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Session History */}
        {history && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Session History</h2>
                <span className="text-xs text-[var(--pf-text-secondary)]">{history.total} sessions</span>
              </div>
            </CardHeader>
            <CardContent>
              <SessionHistoryList data={history} onPageChange={setHistoryPage} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
