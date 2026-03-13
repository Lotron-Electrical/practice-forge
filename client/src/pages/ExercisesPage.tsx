import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DifficultyDots } from '../components/ui/DifficultyDots';
import { Input, Textarea, Select } from '../components/ui/Input';
import { api } from '../api/client';
import type { Exercise, TaxonomyCategory, ExerciseSourceType } from '../core/types';
import { Plus, Search, BookOpen, X, Trash2, Pencil } from 'lucide-react';
import { MUSICAL_KEYS } from '../core/constants';

export function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [categories, setCategories] = useState<TaxonomyCategory[]>([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '', source: '', source_type: 'manual' as ExerciseSourceType,
    category_id: '', key: '', difficulty: '', description: '', tags: '',
  });

  const load = useCallback(() => {
    const params: Record<string, string> = {};
    if (filterCat) params.category_id = filterCat;
    if (filterSource) params.source_type = filterSource;
    if (search) params.search = search;
    api.getExercises(params).then(d => setExercises(d as Exercise[])).catch(() => {});
  }, [filterCat, filterSource, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.getTaxonomy().then(d => setCategories(d as TaxonomyCategory[])).catch(() => {}); }, []);

  const resetForm = () => setForm({ title: '', source: '', source_type: 'manual', category_id: '', key: '', difficulty: '', description: '', tags: '' });

  const openCreate = () => { resetForm(); setEditingId(null); setShowCreate(true); };
  const openEdit = (ex: Exercise) => {
    setEditingId(ex.id);
    setForm({
      title: ex.title, source: ex.source, source_type: ex.source_type,
      category_id: ex.category_id || '', key: ex.key || '', difficulty: ex.difficulty?.toString() || '',
      description: ex.description, tags: Array.isArray(ex.tags) ? ex.tags.join(', ') : '',
    });
    setShowCreate(true);
  };

  const handleSave = async () => {
    const data = {
      ...form,
      category_id: form.category_id || null,
      key: form.key || null,
      difficulty: form.difficulty ? Number(form.difficulty) : null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    };
    if (editingId) {
      await api.updateExercise(editingId, data);
    } else {
      await api.createExercise(data);
    }
    setShowCreate(false);
    resetForm();
    setEditingId(null);
    load();
  };

  const handleDelete = async (id: string) => {
    await api.deleteExercise(id);
    load();
  };

  const topCategories = categories.filter(c => !c.parent_id);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Exercise Library</h1>
        <Button size="sm" onClick={openCreate}><Plus size={16} /> Add Exercise</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mb-6">
        <div className="relative w-full sm:w-auto sm:flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--pf-text-secondary)]" />
          <input
            type="text"
            placeholder="Search exercises..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-pf-sm border border-[var(--pf-border-color)] bg-[var(--pf-bg-input)] text-[var(--pf-text-primary)]"
          />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="px-3 py-2 rounded-pf-sm border border-[var(--pf-border-color)] bg-[var(--pf-bg-input)] text-sm">
          <option value="">All categories</option>
          {topCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className="px-3 py-2 rounded-pf-sm border border-[var(--pf-border-color)] bg-[var(--pf-bg-input)] text-sm">
          <option value="">All sources</option>
          <option value="manual">Manual</option>
          <option value="book">Book</option>
          <option value="teacher">Teacher</option>
          <option value="generated_rule">Generated (rule)</option>
          <option value="generated_ai">Generated (AI)</option>
        </select>
      </div>

      {/* Create/Edit form */}
      {showCreate && (
        <Card className="mb-6">
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editingId ? 'Edit Exercise' : 'New Exercise'}</h2>
              <button onClick={() => { setShowCreate(false); setEditingId(null); }} className="text-[var(--pf-text-secondary)]"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Taffanel & Gaubert No. 4" />
              <Input label="Source" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="e.g. 17 Grands Exercices Journaliers" />
              <Select label="Source type" value={form.source_type} onChange={e => setForm(f => ({ ...f, source_type: e.target.value as ExerciseSourceType }))}>
                <option value="manual">Manual</option>
                <option value="book">Book</option>
                <option value="teacher">Teacher</option>
              </Select>
              <Select label="Category" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                <option value="">Select...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.parent_id ? '  ' : ''}{c.name}</option>)}
              </Select>
              <Select label="Key" value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value }))}>
                <option value="">Any / N/A</option>
                {MUSICAL_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
              </Select>
              <Input label="Difficulty (1-10)" type="number" min="1" max="10" value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))} />
            </div>
            <Textarea label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <Input label="Tags (comma-separated)" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="e.g. warm-up, daily, scales" />
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={() => { setShowCreate(false); setEditingId(null); }}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={!form.title.trim()}>{editingId ? 'Save' : 'Create'}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exercise grid */}
      {exercises.length === 0 && !showCreate ? (
        <Card>
          <CardContent className="text-center py-12">
            <BookOpen size={48} className="mx-auto mb-4 text-[var(--pf-text-secondary)]" />
            <p className="text-[var(--pf-text-secondary)]">No exercises found. Add your first exercise or adjust filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {exercises.map(ex => {
            const cat = categories.find(c => c.id === ex.category_id);
            const tags = Array.isArray(ex.tags) ? ex.tags : (typeof ex.tags === 'string' ? JSON.parse(ex.tags || '[]') : []);
            return (
              <Card key={ex.id} className="hover:shadow-pf-lg transition-shadow group">
                <CardContent>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-sm">{ex.title}</h3>
                      {ex.source && <p className="text-xs text-[var(--pf-text-secondary)]">{ex.source}</p>}
                    </div>
                    <div className="flex sm:hidden sm:group-hover:flex gap-1">
                      <button onClick={() => openEdit(ex)} className="p-1 text-[var(--pf-text-secondary)] hover:text-[var(--pf-text-primary)]"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(ex.id)} className="p-1 text-[var(--pf-text-secondary)] hover:text-[var(--pf-status-needs-work)]"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    {cat && <Badge color="var(--pf-accent-teal)">{cat.name}</Badge>}
                    {ex.key && <Badge color="var(--pf-accent-lavender)">{ex.key}</Badge>}
                    <Badge color="var(--pf-text-secondary)">{ex.source_type}</Badge>
                  </div>
                  <DifficultyDots value={ex.difficulty} />
                  {ex.description && <p className="text-xs text-[var(--pf-text-secondary)] mt-2 line-clamp-2">{ex.description}</p>}
                  {tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {tags.map((t: string) => <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-[var(--pf-bg-hover)] text-[var(--pf-text-secondary)]">{t}</span>)}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
