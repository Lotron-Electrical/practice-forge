import { useEffect, useState } from 'react';
import { Target, Plus, Check, X, Trash2, Edit2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { api } from '../api/client';
import type { Audition, AuditionResult } from '../core/types';

const RESULT_CONFIG: Record<string, { label: string; color: string }> = {
  won: { label: 'Won', color: 'var(--pf-status-ready)' },
  callback: { label: 'Callback', color: 'var(--pf-accent-gold)' },
  unsuccessful: { label: 'Unsuccessful', color: 'var(--pf-status-needs-work)' },
  pending: { label: 'Pending', color: 'var(--pf-text-secondary)' },
  cancelled: { label: 'Cancelled', color: 'var(--pf-text-secondary)' },
};

export function AuditionsPage() {
  const [auditions, setAuditions] = useState<Audition[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', audition_date: '', result: '' as string, notes: '' });

  const load = () => {
    api.getAuditions().then(setAuditions).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.title.trim() || !form.audition_date) return;
    const data = {
      title: form.title.trim(),
      audition_date: form.audition_date,
      result: form.result || null,
      notes: form.notes,
    };
    if (editingId) {
      await api.updateAudition(editingId, data);
    } else {
      await api.createAudition(data);
    }
    resetForm();
    load();
  };

  const handleEdit = (a: Audition) => {
    setForm({ title: a.title, audition_date: a.audition_date, result: a.result || '', notes: a.notes });
    setEditingId(a.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await api.deleteAudition(id);
    load();
  };

  const resetForm = () => {
    setForm({ title: '', audition_date: '', result: '', notes: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = auditions.filter(a => a.audition_date >= today && (!a.result || a.result === 'pending'));
  const past = auditions.filter(a => a.audition_date < today || (a.result && a.result !== 'pending'));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Auditions</h1>
        <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={14} /> New Audition
        </Button>
      </div>

      {/* Create/Edit form */}
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-sm font-semibold">{editingId ? 'Edit Audition' : 'New Audition'}</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Title"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Melbourne Symphony Orchestra — Principal Flute"
              />
              <Input
                label="Date"
                type="date"
                value={form.audition_date}
                onChange={e => setForm(f => ({ ...f, audition_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--pf-text-secondary)] mb-2 block">Result</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(RESULT_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setForm(f => ({ ...f, result: f.result === key ? '' : key }))}
                    className={`px-3 py-1.5 rounded-pf-sm text-xs font-medium border transition-colors ${
                      form.result === key
                        ? 'border-current bg-current/10'
                        : 'border-[var(--pf-border-color)] hover:border-current'
                    }`}
                    style={{ color: cfg.color }}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>
            <Textarea
              label="Notes / Post-mortem"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="What went well? What to work on? Panel feedback?"
            />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={resetForm}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={!form.title.trim() || !form.audition_date}>
                <Check size={14} /> {editingId ? 'Update' : 'Save'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-[var(--pf-text-secondary)] uppercase tracking-wider mb-3">Upcoming</h2>
          <div className="space-y-3">
            {upcoming.map(a => {
              const daysUntil = Math.ceil((new Date(a.audition_date).getTime() - Date.now()) / 86400000);
              return (
                <Card key={a.id} borderColor="var(--pf-accent-gold)">
                  <CardContent className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Target size={16} style={{ color: 'var(--pf-accent-gold)' }} />
                        <h3 className="font-medium">{a.title}</h3>
                      </div>
                      <p className="text-sm text-[var(--pf-text-secondary)]">
                        {new Date(a.audition_date + 'T12:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      {a.notes && <p className="text-sm mt-2">{a.notes}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`text-right ${daysUntil <= 3 ? 'text-[var(--pf-status-needs-work)]' : daysUntil <= 7 ? 'text-[var(--pf-accent-gold)]' : ''}`}>
                        <span className="text-2xl font-bold">{daysUntil}</span>
                        <span className="text-xs block">days</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button onClick={() => handleEdit(a)} className="p-1 text-[var(--pf-text-secondary)] hover:text-[var(--pf-text-primary)]"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(a.id)} className="p-1 text-[var(--pf-text-secondary)] hover:text-[var(--pf-status-needs-work)]"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[var(--pf-text-secondary)] uppercase tracking-wider mb-3">Past Auditions</h2>
          <div className="space-y-3">
            {past.map(a => {
              const cfg = a.result ? RESULT_CONFIG[a.result] : null;
              return (
                <Card key={a.id}>
                  <CardContent className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{a.title}</h3>
                        {cfg && (
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: cfg.color, backgroundColor: `color-mix(in srgb, ${cfg.color} 10%, transparent)` }}>
                            {cfg.label}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--pf-text-secondary)]">
                        {new Date(a.audition_date + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      {a.notes && <p className="text-sm text-[var(--pf-text-secondary)] mt-2">{a.notes}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(a)} className="p-1 text-[var(--pf-text-secondary)] hover:text-[var(--pf-text-primary)]"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(a.id)} className="p-1 text-[var(--pf-text-secondary)] hover:text-[var(--pf-status-needs-work)]"><Trash2 size={14} /></button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {auditions.length === 0 && !showForm && (
        <Card>
          <CardContent className="py-12 text-center">
            <Target size={32} className="mx-auto mb-3 text-[var(--pf-text-secondary)]" />
            <p className="text-sm text-[var(--pf-text-secondary)]">No auditions recorded yet.</p>
            <p className="text-xs text-[var(--pf-text-secondary)] mt-1">Add an upcoming audition to track your preparation.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
