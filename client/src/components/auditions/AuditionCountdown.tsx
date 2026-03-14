import { useEffect, useState } from 'react';
import { Target, Plus, Calendar, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { api } from '../../api/client';
import type { UpcomingAuditions, Audition } from '../../core/types';

export function AuditionCountdown() {
  const [data, setData] = useState<UpcomingAuditions | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    api.getUpcomingAuditions().then(setData).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const hasUpcoming = data && (
    data.auditions.length > 0 ||
    data.pieces_with_dates.length > 0 ||
    data.excerpts_with_dates.length > 0
  );

  const handleCreate = async () => {
    if (!title.trim() || !date) return;
    setSubmitting(true);
    try {
      await api.createAudition({ title: title.trim(), audition_date: date });
      setTitle('');
      setDate('');
      setShowForm(false);
      load();
    } catch {}
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    await api.deleteAudition(id);
    load();
  };

  if (!hasUpcoming && !showForm) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[var(--pf-text-secondary)]">
              <Target size={16} />
              <span className="text-sm">No upcoming auditions</span>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(true)}>
              <Plus size={14} /> Add
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card borderColor="var(--pf-accent-gold)">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Target size={16} style={{ color: 'var(--pf-accent-gold)' }} />
            Audition Countdown
          </h3>
          <Button size="sm" variant="ghost" onClick={() => setShowForm(!showForm)}>
            <Plus size={14} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Auditions */}
        {data?.auditions.map(a => (
          <div key={a.id} className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{a.title}</p>
              <p className="text-xs text-[var(--pf-text-secondary)]">
                {new Date(a.audition_date + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`text-right ${
                (a.days_until ?? 0) <= 3 ? 'text-[var(--pf-status-needs-work)]' :
                (a.days_until ?? 0) <= 7 ? 'text-[var(--pf-accent-gold)]' :
                'text-[var(--pf-text-primary)]'
              }`}>
                <span className="text-lg font-bold">{a.days_until}</span>
                <span className="text-xs ml-1">days</span>
              </div>
              <button onClick={() => handleDelete(a.id)} className="p-1 text-[var(--pf-text-secondary)] hover:text-[var(--pf-status-needs-work)]">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}

        {/* Pieces with audition dates */}
        {data?.pieces_with_dates.map(p => (
          <div key={`p-${p.id}`} className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{p.title}</p>
              <p className="text-xs text-[var(--pf-text-secondary)]">{p.composer} (piece)</p>
            </div>
            <div className={`text-right ${
              p.days_until <= 3 ? 'text-[var(--pf-status-needs-work)]' :
              p.days_until <= 7 ? 'text-[var(--pf-accent-gold)]' :
              'text-[var(--pf-text-primary)]'
            }`}>
              <span className="text-lg font-bold">{p.days_until}</span>
              <span className="text-xs ml-1">days</span>
            </div>
          </div>
        ))}

        {/* Excerpts with audition dates */}
        {data?.excerpts_with_dates.map(e => (
          <div key={`e-${e.id}`} className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{e.title}</p>
              <p className="text-xs text-[var(--pf-text-secondary)]">{e.composer} (excerpt)</p>
            </div>
            <div className={`text-right ${
              e.days_until <= 3 ? 'text-[var(--pf-status-needs-work)]' :
              e.days_until <= 7 ? 'text-[var(--pf-accent-gold)]' :
              'text-[var(--pf-text-primary)]'
            }`}>
              <span className="text-lg font-bold">{e.days_until}</span>
              <span className="text-xs ml-1">days</span>
            </div>
          </div>
        ))}

        {/* Add form */}
        {showForm && (
          <div className="pt-3 border-t border-[var(--pf-border-color)] space-y-2">
            <Input
              label="Audition title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Melbourne Symphony Orchestra"
            />
            <Input
              label="Date"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreate} disabled={!title.trim() || !date || submitting}>
                {submitting ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
