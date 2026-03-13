import { useEffect, useState } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusIndicator } from '../components/ui/StatusIndicator';
import { DifficultyDots } from '../components/ui/DifficultyDots';
import { Input, Textarea, Select } from '../components/ui/Input';
import { EXCERPT_STATUS_CONFIG } from '../core/constants';
import { api } from '../api/client';
import type { Excerpt, ExcerptStatus } from '../core/types';
import { Plus, ListMusic, Trash2, Pencil, X } from 'lucide-react';

export function ExcerptsPage() {
  const [excerpts, setExcerpts] = useState<Excerpt[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '', composer: '', full_work_title: '', location_in_score: '',
    difficulty: '', status: 'needs_work' as ExcerptStatus,
    historical_context: '', performance_notes: '',
  });

  const load = () => api.getExcerpts().then(d => setExcerpts(d as Excerpt[])).catch(() => {});
  useEffect(() => { load(); }, []);

  const resetForm = () => setForm({ title: '', composer: '', full_work_title: '', location_in_score: '', difficulty: '', status: 'needs_work', historical_context: '', performance_notes: '' });

  const openCreate = () => { resetForm(); setEditingId(null); setShowForm(true); };
  const openEdit = (ex: Excerpt) => {
    setEditingId(ex.id);
    setForm({
      title: ex.title, composer: ex.composer, full_work_title: ex.full_work_title,
      location_in_score: ex.location_in_score, difficulty: ex.difficulty?.toString() || '',
      status: ex.status, historical_context: ex.historical_context, performance_notes: ex.performance_notes,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    const data = { ...form, difficulty: form.difficulty ? Number(form.difficulty) : null };
    if (editingId) {
      await api.updateExcerpt(editingId, data);
    } else {
      await api.createExcerpt(data);
    }
    setShowForm(false);
    resetForm();
    setEditingId(null);
    load();
  };

  const handleDelete = async (id: string) => {
    await api.deleteExcerpt(id);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Orchestral Excerpts</h1>
        <Button size="sm" onClick={openCreate}><Plus size={16} /> Add Excerpt</Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editingId ? 'Edit Excerpt' : 'New Excerpt'}</h2>
              <button onClick={() => { setShowForm(false); setEditingId(null); }}><X size={18} className="text-[var(--pf-text-secondary)]" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Brahms Symphony No. 4 — Mvt. 4 flute solo" />
              <Input label="Composer" value={form.composer} onChange={e => setForm(f => ({ ...f, composer: e.target.value }))} />
              <Input label="Full work title" value={form.full_work_title} onChange={e => setForm(f => ({ ...f, full_work_title: e.target.value }))} />
              <Input label="Location in score" value={form.location_in_score} onChange={e => setForm(f => ({ ...f, location_in_score: e.target.value }))} placeholder="e.g. Rehearsal D, bars 93-108" />
              <Input label="Difficulty (1-10)" type="number" min="1" max="10" value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))} />
              <Select label="Status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as ExcerptStatus }))}>
                <option value="needs_work">Needs work</option>
                <option value="acceptable">Acceptable</option>
                <option value="solid">Solid</option>
                <option value="audition_ready">Audition ready</option>
              </Select>
            </div>
            <Textarea label="Performance notes" value={form.performance_notes} onChange={e => setForm(f => ({ ...f, performance_notes: e.target.value }))} />
            <Textarea label="Historical context" value={form.historical_context} onChange={e => setForm(f => ({ ...f, historical_context: e.target.value }))} />
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={!form.title.trim()}>{editingId ? 'Save' : 'Create'}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {excerpts.length === 0 && !showForm ? (
        <Card>
          <CardContent className="text-center py-12">
            <ListMusic size={48} className="mx-auto mb-4 text-[var(--pf-text-secondary)]" />
            <p className="text-[var(--pf-text-secondary)]">No excerpts yet. Add your first orchestral excerpt.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {excerpts.map(ex => {
            const sConf = EXCERPT_STATUS_CONFIG[ex.status];
            return (
              <Card key={ex.id} borderColor={`var(${sConf.colorVar})`} className="group">
                <CardContent className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-semibold text-sm">{ex.title}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[var(--pf-text-secondary)]">
                      <span>{ex.composer}</span>
                      {ex.full_work_title && <span>{ex.full_work_title}</span>}
                      {ex.location_in_score && <span>{ex.location_in_score}</span>}
                    </div>
                  </div>
                  <DifficultyDots value={ex.difficulty} />
                  <StatusIndicator {...sConf} size="sm" />
                  <div className="hidden group-hover:flex gap-1">
                    <button onClick={() => openEdit(ex)} className="p-1 text-[var(--pf-text-secondary)] hover:text-[var(--pf-text-primary)]"><Pencil size={14} /></button>
                    <button onClick={() => handleDelete(ex.id)} className="p-1 text-[var(--pf-text-secondary)] hover:text-[var(--pf-status-needs-work)]"><Trash2 size={14} /></button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
