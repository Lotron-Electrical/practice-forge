import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusIndicator } from '../components/ui/StatusIndicator';
import { DifficultyDots } from '../components/ui/DifficultyDots';
import { Input, Textarea, Select } from '../components/ui/Input';
import { EXCERPT_STATUS_CONFIG } from '../core/constants';
import { api } from '../api/client';
import type { Excerpt, ExcerptStatus } from '../core/types';
import { Plus, ListMusic, Trash2, Pencil, X, BookOpen, Wand2, Loader, Search, Check, SlidersHorizontal, Clock, ThumbsUp, Meh, ThumbsDown, CheckCircle } from 'lucide-react';
import { useExperienceLevel } from '../hooks/useExperienceLevel';
import { useModalLock } from '../hooks/useModalLock';
import { ResourceFinderPanel } from '../components/resources/ResourceFinderPanel';
import { ExcerptCommunityPanel } from '../components/community/ExcerptCommunityPanel';
import { AiCostConfirm } from '../components/ui/AiCostConfirm';
import { GeneratedExerciseCard } from '../components/composition/GeneratedExerciseCard';
import type { GeneratedExercise, TaxonomyCategory } from '../core/types';

const STATUS_ORDER: Record<ExcerptStatus, number> = {
  needs_work: 0,
  acceptable: 1,
  solid: 2,
  audition_ready: 3,
};

export function ExcerptsPage() {
  const { level } = useExperienceLevel();
  const [excerpts, setExcerpts] = useState<Excerpt[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedResourceId, setExpandedResourceId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteValue, setEditingNoteValue] = useState('');
  const [categories, setCategories] = useState<TaxonomyCategory[]>([]);
  const [prepExcerptId, setPrepExcerptId] = useState<string | null>(null);
  const [prepLoading, setPrepLoading] = useState(false);
  const [prepResult, setPrepResult] = useState<GeneratedExercise | null>(null);
  const [showPrepCost, setShowPrepCost] = useState(false);
  const [prepEstimatedCost, setPrepEstimatedCost] = useState('');
  const [logExcerptId, setLogExcerptId] = useState<string | null>(null);
  const [logDuration, setLogDuration] = useState(10);
  const [logRating, setLogRating] = useState<string | null>(null);
  const [logSubmitting, setLogSubmitting] = useState(false);
  const [loggedId, setLoggedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '', composer: '', full_work_title: '', location_in_score: '',
    difficulty: '', status: 'needs_work' as ExcerptStatus,
    historical_context: '', performance_notes: '',
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('recent');
  const [showFilters, setShowFilters] = useState(level !== 'beginner');

  useModalLock(!!(prepResult && prepExcerptId) || showPrepCost);

  const load = () => api.getExcerpts().then(d => setExcerpts(d as Excerpt[])).catch(() => {});
  useEffect(() => { load(); }, []);
  useEffect(() => { api.getTaxonomy().then(d => setCategories(d as TaxonomyCategory[])).catch(() => {}); }, []);

  const formatRelativeDate = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  };

  const startEditNote = (ex: Excerpt) => {
    setEditingNoteId(ex.id);
    setEditingNoteValue(ex.performance_notes || '');
  };

  const saveNote = async (id: string) => {
    await api.updateExcerpt(id, { performance_notes: editingNoteValue });
    setEditingNoteId(null);
    setExcerpts(prev => prev.map(ex => ex.id === id ? { ...ex, performance_notes: editingNoteValue } : ex));
  };

  const filteredExcerpts = useMemo(() => {
    let result = [...excerpts];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(ex =>
        ex.title.toLowerCase().includes(q) || ex.composer.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(ex => ex.status === statusFilter);
    }

    // Sort
    if (sortBy === 'title') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'difficulty') {
      result.sort((a, b) => (b.difficulty ?? 0) - (a.difficulty ?? 0));
    } else if (sortBy === 'status') {
      result.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
    } else if (sortBy === 'last_practiced') {
      result.sort((a, b) => {
        if (!a.last_practiced && !b.last_practiced) return 0;
        if (!a.last_practiced) return 1;
        if (!b.last_practiced) return -1;
        return new Date(b.last_practiced).getTime() - new Date(a.last_practiced).getTime();
      });
    }
    // 'recent' keeps the default server order (most recently added first)

    return result;
  }, [excerpts, searchQuery, statusFilter, sortBy]);

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

  const logRatings = [
    { value: 'good', icon: ThumbsUp, label: 'Good', color: 'var(--pf-status-ready)' },
    { value: 'okay', icon: Meh, label: 'Okay', color: 'var(--pf-accent-gold)' },
    { value: 'bad', icon: ThumbsDown, label: 'Tough', color: 'var(--pf-status-needs-work)' },
  ];

  const openLogForm = (id: string) => {
    if (!id || id === logExcerptId) {
      setLogExcerptId(null);
      return;
    }
    setLogExcerptId(id);
    setLogDuration(10);
    setLogRating(null);
  };

  const handleQuickLog = async (excerptTitle: string) => {
    if (logSubmitting) return;
    setLogSubmitting(true);
    try {
      await api.quickLog({ notes: excerptTitle, duration_min: logDuration, rating: logRating || undefined });
      setLogExcerptId(null);
      setLoggedId(logExcerptId);
      setTimeout(() => setLoggedId(null), 1500);
    } catch { /* ignore */ }
    setLogSubmitting(false);
  };

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
        <h1 className="text-2xl font-bold">{level === 'beginner' ? 'Practice Rotation' : 'Orchestral Excerpts'}</h1>
        <Button size="sm" onClick={openCreate}><Plus size={16} /> {level === 'beginner' ? 'Add Passage' : 'Add Excerpt'}</Button>
      </div>

      {/* Search and filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--pf-text-secondary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search excerpts..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--pf-border-color)] bg-[var(--pf-bg-primary)] text-[var(--pf-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pf-accent-primary)]"
          />
        </div>
        {level === 'beginner' && (
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${showFilters ? 'border-[var(--pf-accent-primary)] text-[var(--pf-accent-primary)] bg-[var(--pf-accent-primary)]/10' : 'border-[var(--pf-border-color)] text-[var(--pf-text-secondary)] bg-[var(--pf-bg-primary)] hover:text-[var(--pf-text-primary)]'}`}
          >
            <SlidersHorizontal size={14} />
            Filters
          </button>
        )}
        {showFilters && (
          <>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[var(--pf-border-color)] bg-[var(--pf-bg-primary)] text-[var(--pf-text-primary)] text-sm"
            >
              <option value="all">All statuses</option>
              <option value="needs_work">Needs work</option>
              <option value="acceptable">Acceptable</option>
              <option value="solid">Solid</option>
              <option value="audition_ready">Audition ready</option>
            </select>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[var(--pf-border-color)] bg-[var(--pf-bg-primary)] text-[var(--pf-text-primary)] text-sm"
            >
              <option value="recent">Sort: Recently Added</option>
              <option value="title">Sort: Title</option>
              <option value="difficulty">Sort: Difficulty</option>
              <option value="status">Sort: Status</option>
              <option value="last_practiced">Sort: Last Practiced</option>
            </select>
          </>
        )}
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editingId ? 'Edit Excerpt' : 'New Excerpt'}</h2>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} aria-label="Close form"><X size={18} className="text-[var(--pf-text-secondary)]" /></button>
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

      {filteredExcerpts.length === 0 && !showForm ? (
        <Card>
          <CardContent className="text-center py-12">
            <ListMusic size={48} className="mx-auto mb-4 text-[var(--pf-text-secondary)]" />
            <p className="text-[var(--pf-text-secondary)]">
              {excerpts.length === 0
                ? 'No excerpts yet. Excerpts are short orchestral passages you practice regularly for auditions or orchestra prep.'
                : 'No excerpts match your filters.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredExcerpts.map(ex => {
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
                    <div className="flex items-center gap-2 mt-1">
                      {editingNoteId === ex.id ? (
                        <div className="flex items-center gap-1 flex-1">
                          <input
                            type="text"
                            value={editingNoteValue}
                            onChange={e => setEditingNoteValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveNote(ex.id); if (e.key === 'Escape') setEditingNoteId(null); }}
                            onBlur={() => saveNote(ex.id)}
                            autoFocus
                            placeholder="Add a note..."
                            className="flex-1 text-xs italic bg-transparent border-b border-[var(--pf-border-color)] text-[var(--pf-text-primary)] focus:outline-none focus:border-[var(--pf-accent-primary)] py-0.5"
                          />
                          <button onClick={() => saveNote(ex.id)} className="text-[var(--pf-text-secondary)] hover:text-[var(--pf-accent-primary)]" aria-label="Save note"><Check size={12} /></button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditNote(ex)}
                          className="flex items-center gap-1 text-xs italic text-[var(--pf-text-secondary)] hover:text-[var(--pf-text-primary)] transition-colors"
                        >
                          {ex.performance_notes
                            ? <span>{ex.performance_notes}</span>
                            : <span className="opacity-50">Add a note...</span>}
                          <Pencil size={10} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                        </button>
                      )}
                      {ex.last_practiced && (
                        <span className="text-[10px] text-[var(--pf-text-secondary)] bg-[var(--pf-bg-secondary)] px-1.5 py-0.5 rounded whitespace-nowrap">
                          {formatRelativeDate(ex.last_practiced)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <DifficultyDots value={ex.difficulty} />
                    <StatusIndicator {...sConf} size="sm" />
                    <div className="flex sm:hidden sm:group-hover:flex gap-1">
                      <button onClick={() => handleGeneratePrep(ex.id)} className="p-2.5 sm:p-1 text-[var(--pf-text-secondary)] hover:text-[var(--pf-accent-gold)]" title="Generate prep routine" aria-label="Generate prep routine" disabled={prepLoading && prepExcerptId === ex.id}>
                        {prepLoading && prepExcerptId === ex.id ? <Loader size={14} className="animate-spin" /> : <Wand2 size={14} />}
                      </button>
                      <button onClick={() => openLogForm(logExcerptId === ex.id ? '' : ex.id)} className="p-2.5 sm:p-1 text-[var(--pf-text-secondary)] hover:text-[var(--pf-accent-gold)]" title="Log practice" aria-label="Log practice">
                        {loggedId === ex.id ? <CheckCircle size={14} style={{ color: 'var(--pf-status-ready)' }} /> : <Clock size={14} />}
                      </button>
                      <button onClick={() => setExpandedResourceId(expandedResourceId === ex.id ? null : ex.id)} className="p-2.5 sm:p-1 text-[var(--pf-text-secondary)] hover:text-[var(--pf-accent-teal)]" title="Resources" aria-label="Resources"><BookOpen size={14} /></button>
                      <button onClick={() => openEdit(ex)} className="p-2.5 sm:p-1 text-[var(--pf-text-secondary)] hover:text-[var(--pf-text-primary)]" aria-label="Edit"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(ex.id)} className="p-2.5 sm:p-1 text-[var(--pf-text-secondary)] hover:text-[var(--pf-status-needs-work)]" aria-label="Delete"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </CardContent>
                {logExcerptId === ex.id && (
                  <div className="px-4 pb-3 pt-0 border-t border-[var(--pf-border-color)]">
                    <div className="pt-3 flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-[var(--pf-text-secondary)]">Duration</label>
                        <input
                          type="number"
                          min={1}
                          value={logDuration}
                          onChange={e => setLogDuration(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 px-2 py-1 rounded-md border text-xs focus:outline-none"
                          style={{ borderColor: 'var(--pf-border-color)', backgroundColor: 'var(--pf-bg-primary)', color: 'var(--pf-text-primary)' }}
                        />
                        <span className="text-xs text-[var(--pf-text-secondary)]">min</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {logRatings.map(({ value, icon: Icon, label, color }) => (
                          <button
                            key={value}
                            onClick={() => setLogRating(logRating === value ? null : value)}
                            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors border"
                            style={{
                              borderColor: logRating === value ? color : 'var(--pf-border-color)',
                              backgroundColor: logRating === value ? `color-mix(in srgb, ${color} 12%, transparent)` : 'transparent',
                              color: logRating === value ? color : 'var(--pf-text-secondary)',
                            }}
                          >
                            <Icon size={12} /> {label}
                          </button>
                        ))}
                      </div>
                      <button
                        disabled={logSubmitting}
                        onClick={() => handleQuickLog(ex.title)}
                        className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-all disabled:opacity-40"
                        style={{ backgroundColor: 'var(--pf-accent-gold)', color: '#1a1a2e' }}
                      >
                        {logSubmitting ? <><Loader size={12} className="animate-spin" /> Logging...</> : <><CheckCircle size={12} /> Log</>}
                      </button>
                      <button onClick={() => setLogExcerptId(null)} className="p-1 text-[var(--pf-text-secondary)] hover:text-[var(--pf-text-primary)]"><X size={14} /></button>
                    </div>
                  </div>
                )}
                {loggedId === ex.id && !logExcerptId && (
                  <div className="px-4 pb-3 pt-0 border-t border-[var(--pf-border-color)]">
                    <div className="pt-2 flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--pf-status-ready)' }}>
                      <CheckCircle size={14} /> Logged
                    </div>
                  </div>
                )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 overflow-y-auto" onClick={() => { setPrepResult(null); setPrepExcerptId(null); }}>
          <div role="dialog" aria-modal="true" aria-label="Preparation Routine" className="w-full max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <Card>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Preparation Routine</h2>
                  <button onClick={() => { setPrepResult(null); setPrepExcerptId(null); }} className="text-[var(--pf-text-secondary)]" aria-label="Close"><X size={18} /></button>
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
