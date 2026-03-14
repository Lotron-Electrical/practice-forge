import { useEffect, useState } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusIndicator } from '../components/ui/StatusIndicator';
import { DifficultyDots } from '../components/ui/DifficultyDots';
import { Input, Textarea, Select } from '../components/ui/Input';
import { EXCERPT_STATUS_CONFIG } from '../core/constants';
import { api } from '../api/client';
import type { Excerpt, ExcerptStatus } from '../core/types';
import { Plus, ListMusic, Trash2, Pencil, X, BookOpen, Wand2, Loader } from 'lucide-react';
import { ResourceFinderPanel } from '../components/resources/ResourceFinderPanel';
import { ExcerptCommunityPanel } from '../components/community/ExcerptCommunityPanel';
import { AiCostConfirm } from '../components/ui/AiCostConfirm';
import { GeneratedExerciseCard } from '../components/composition/GeneratedExerciseCard';
import type { GeneratedExercise, TaxonomyCategory } from '../core/types';

export function ExcerptsPage() {
  const [excerpts, setExcerpts] = useState<Excerpt[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedResourceId, setExpandedResourceId] = useState<string | null>(null);
  const [categories, setCategories] = useState<TaxonomyCategory[]>([]);
  const [prepExcerptId, setPrepExcerptId] = useState<string | null>(null);
  const [prepLoading, setPrepLoading] = useState(false);
  const [prepResult, setPrepResult] = useState<GeneratedExercise | null>(null);
  const [showPrepCost, setShowPrepCost] = useState(false);
  const [prepEstimatedCost, setPrepEstimatedCost] = useState('');
  const [form, setForm] = useState({
    title: '', composer: '', full_work_title: '', location_in_score: '',
    difficulty: '', status: 'needs_work' as ExcerptStatus,
    historical_context: '', performance_notes: '',
  });

  const load = () => api.getExcerpts().then(d => setExcerpts(d as Excerpt[])).catch(() => {});
  useEffect(() => { load(); }, []);
  useEffect(() => { api.getTaxonomy().then(d => setCategories(d as TaxonomyCategory[])).catch(() => {}); }, []);

  const handleGeneratePrep = async (excerptId: string) => {
    setPrepExcerptId(excerptId);
    setPrepLoading(true);
    setPrepResult(null);
    try {
      const data = await api.generateExcerptPrep(excerptId) as any;
      if (data.requires_confirmation) {
        setPrepEstimatedCost(data.estimated_cost || 'Unknown');
        setShowPrepCost(true);
        setPrepLoading(false);
        return;
      }
      setPrepResult(data as GeneratedExercise);
    } catch { /* handled */ }
    setPrepLoading(false);
  };

  const confirmPrepGenerate = async () => {
    if (!prepExcerptId) return;
    setShowPrepCost(false);
    setPrepLoading(true);
    try {
      const data = await api.generateExcerptPrep(prepExcerptId, true) as GeneratedExercise;
      setPrepResult(data);
    } catch { /* handled */ }
    setPrepLoading(false);
  };

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
    if (!confirm('Delete this excerpt?')) return;
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
                <CardContent className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-semibold text-sm">{ex.title}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[var(--pf-text-secondary)] flex-wrap">
                      <span>{ex.composer}</span>
                      {ex.full_work_title && <span>{ex.full_work_title}</span>}
                      {ex.location_in_score && <span>{ex.location_in_score}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <DifficultyDots value={ex.difficulty} />
                    <StatusIndicator {...sConf} size="sm" />
                    <div className="flex sm:hidden sm:group-hover:flex gap-1">
                      <button onClick={() => handleGeneratePrep(ex.id)} className="p-2.5 sm:p-1 text-[var(--pf-text-secondary)] hover:text-[var(--pf-accent-gold)]" title="Generate prep routine" disabled={prepLoading && prepExcerptId === ex.id}>
                        {prepLoading && prepExcerptId === ex.id ? <Loader size={14} className="animate-spin" /> : <Wand2 size={14} />}
                      </button>
                      <button onClick={() => setExpandedResourceId(expandedResourceId === ex.id ? null : ex.id)} className="p-2.5 sm:p-1 text-[var(--pf-text-secondary)] hover:text-[var(--pf-accent-teal)]" title="Resources"><BookOpen size={14} /></button>
                      <button onClick={() => openEdit(ex)} className="p-2.5 sm:p-1 text-[var(--pf-text-secondary)] hover:text-[var(--pf-text-primary)]"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(ex.id)} className="p-2.5 sm:p-1 text-[var(--pf-text-secondary)] hover:text-[var(--pf-status-needs-work)]"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </CardContent>
                {expandedResourceId === ex.id && (
                  <div className="px-4 pb-4 pt-0 border-t border-[var(--pf-border-color)]">
                    <div className="pt-3">
                      <ResourceFinderPanel linkedType="excerpt" linkedId={ex.id} title={ex.title} composer={ex.composer} />
                    </div>
                    <div className="pt-3">
                      <ExcerptCommunityPanel excerptId={ex.id} />
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
      {/* Generated prep result */}
      {prepResult && prepExcerptId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto" onClick={() => { setPrepResult(null); setPrepExcerptId(null); }}>
          <div className="w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <Card>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Preparation Routine</h2>
                  <button onClick={() => { setPrepResult(null); setPrepExcerptId(null); }} className="text-[var(--pf-text-secondary)]"><X size={18} /></button>
                </div>
                <GeneratedExerciseCard exercise={prepResult} categories={categories} onSaved={load} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {showPrepCost && (
        <AiCostConfirm
          estimatedCost={prepEstimatedCost}
          description="Generate excerpt preparation routine using Claude AI"
          onConfirm={confirmPrepGenerate}
          onCancel={() => { setShowPrepCost(false); setPrepLoading(false); }}
        />
      )}
    </div>
  );
}
