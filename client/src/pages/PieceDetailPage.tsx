import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusIndicator } from '../components/ui/StatusIndicator';
import { DifficultyDots } from '../components/ui/DifficultyDots';
import { Badge } from '../components/ui/Badge';
import { Input, Textarea, Select } from '../components/ui/Input';
import { PIECE_STATUS_CONFIG, SECTION_STATUS_CONFIG, PRIORITY_CONFIG } from '../core/constants';
import { api } from '../api/client';
import type { Piece, Section, TechnicalDemand, TaxonomyCategory, PieceStatus, Priority, SectionStatus, UploadedFile } from '../core/types';
import { LinkedFiles } from '../components/ui/LinkedFiles';
import { Plus, Trash2, ArrowLeft, ChevronRight, Sparkles } from 'lucide-react';

export function PieceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [piece, setPiece] = useState<Piece | null>(null);
  const [categories, setCategories] = useState<TaxonomyCategory[]>([]);
  const [linkedFiles, setLinkedFiles] = useState<UploadedFile[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Piece>>({});

  // Section form
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [sectionForm, setSectionForm] = useState({ name: '', bar_range: '', status: 'not_started' as SectionStatus });

  // Demand form
  const [showDemandForm, setShowDemandForm] = useState(false);
  const [demandForm, setDemandForm] = useState({ description: '', category_id: '', difficulty: '', bar_range: '', notes: '' });

  const load = useCallback(() => {
    if (!id) return;
    api.getPiece(id).then(d => {
      const p = d as Piece;
      setPiece(p);
      setForm(p);
    }).catch(() => {});
    api.getTaxonomy().then(d => setCategories(d as TaxonomyCategory[])).catch(() => {});
    if (id) api.getFiles({ linked_type: 'piece', linked_id: id }).then(d => setLinkedFiles(d as UploadedFile[])).catch(() => {});
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (!piece) return <div className="text-[var(--pf-text-secondary)]">Loading...</div>;

  const statusConf = PIECE_STATUS_CONFIG[piece.status];
  const priorityConf = PRIORITY_CONFIG[piece.priority];
  const daysUntil = piece.target_date ? Math.ceil((new Date(piece.target_date).getTime() - Date.now()) / 86400000) : null;

  const saveEdit = async () => {
    await api.updatePiece(piece.id, { ...form, difficulty: form.difficulty ? Number(form.difficulty) : null });
    setEditing(false);
    load();
  };

  const addSection = async () => {
    await api.createSection(piece.id, { ...sectionForm, sort_order: piece.sections.length });
    setShowSectionForm(false);
    setSectionForm({ name: '', bar_range: '', status: 'not_started' });
    load();
  };

  const updateSectionStatus = async (sId: string, status: SectionStatus) => {
    await api.updateSection(piece.id, sId, { status });
    load();
  };

  const deleteSection = async (sId: string) => {
    await api.deleteSection(piece.id, sId);
    load();
  };

  const addDemand = async () => {
    await api.createDemand(piece.id, {
      ...demandForm,
      category_id: demandForm.category_id || null,
      difficulty: demandForm.difficulty ? Number(demandForm.difficulty) : null,
    });
    setShowDemandForm(false);
    setDemandForm({ description: '', category_id: '', difficulty: '', bar_range: '', notes: '' });
    load();
  };

  const deleteDemand = async (dId: string) => {
    await api.deleteDemand(piece.id, dId);
    load();
  };

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--pf-text-secondary)] mb-4">
        <Link to="/pieces" className="hover:text-[var(--pf-text-primary)]">Pieces</Link>
        <ChevronRight size={14} />
        <span className="text-[var(--pf-text-primary)]">{piece.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">{piece.title}</h1>
              <p className="text-[var(--pf-text-secondary)]">{piece.composer}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusIndicator {...statusConf} />
              <Button variant="secondary" size="sm" onClick={() => setEditing(!editing)}>
                {editing ? 'Cancel' : 'Edit'}
              </Button>
            </div>
          </div>

          {/* Edit form */}
          {editing && (
            <Card>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Title" value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                  <Input label="Composer" value={form.composer || ''} onChange={e => setForm(f => ({ ...f, composer: e.target.value }))} />
                  <Input label="Difficulty" type="number" min="1" max="10" value={form.difficulty ?? ''} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value ? Number(e.target.value) : null }))} />
                  <Select label="Priority" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}>
                    <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
                  </Select>
                  <Select label="Status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as PieceStatus }))}>
                    <option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="performance_ready">Performance ready</option><option value="archived">Archived</option>
                  </Select>
                  <Input label="Target date" type="date" value={form.target_date || ''} onChange={e => setForm(f => ({ ...f, target_date: e.target.value || null }))} />
                </div>
                <Textarea label="Notes" value={form.general_notes || ''} onChange={e => setForm(f => ({ ...f, general_notes: e.target.value }))} />
                <div className="flex justify-end"><Button size="sm" onClick={saveEdit}>Save Changes</Button></div>
              </CardContent>
            </Card>
          )}

          {/* Technical Demands */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Technical Demands</h2>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => {
                    const sheetMusic = linkedFiles.find(f => f.file_type === 'sheet_music_digital' || f.file_type === 'sheet_music_scanned');
                    if (sheetMusic) navigate(`/scores/${sheetMusic.id}`);
                  }} disabled={!linkedFiles.some(f => f.file_type === 'sheet_music_digital' || f.file_type === 'sheet_music_scanned')}>
                    <Sparkles size={14} /> Auto-detect
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowDemandForm(true)}><Plus size={14} /> Add</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {piece.technical_demands.length === 0 && !showDemandForm && (
                <p className="text-sm text-[var(--pf-text-secondary)]">No technical demands yet.</p>
              )}
              <div className="space-y-3">
                {piece.technical_demands.map(td => {
                  const cat = categories.find(c => c.id === td.category_id);
                  return (
                    <div key={td.id} className="flex items-start gap-3 py-2 border-b border-[var(--pf-border-color)] last:border-0">
                      <div className="w-1 h-full min-h-[40px] rounded-full" style={{ backgroundColor: 'var(--pf-accent-teal)' }} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{td.description}</span>
                          {cat && <Badge color="var(--pf-accent-teal)">{cat.name}</Badge>}
                          {td.difficulty && <span className="text-xs text-[var(--pf-text-secondary)]">{td.difficulty}/10</span>}
                        </div>
                        {td.bar_range && <span className="text-xs text-[var(--pf-text-secondary)]">Bars {td.bar_range}</span>}
                        {td.linked_exercises && td.linked_exercises.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {td.linked_exercises.map(ex => (
                              <Link key={ex.id} to={`/exercises`} className="text-xs underline" style={{ color: 'var(--pf-accent-teal)' }}>{ex.title}</Link>
                            ))}
                          </div>
                        )}
                      </div>
                      <button onClick={() => deleteDemand(td.id)} className="p-1 text-[var(--pf-text-secondary)] hover:text-[var(--pf-status-needs-work)]"><Trash2 size={14} /></button>
                    </div>
                  );
                })}
              </div>
              {showDemandForm && (
                <div className="mt-4 p-4 border border-[var(--pf-border-color)] rounded-pf space-y-3">
                  <Input label="Description" value={demandForm.description} onChange={e => setDemandForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Scale in thirds — G major" />
                  <div className="grid grid-cols-3 gap-3">
                    <Select label="Category" value={demandForm.category_id} onChange={e => setDemandForm(f => ({ ...f, category_id: e.target.value }))}>
                      <option value="">Select...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.parent_id ? '  ' : ''}{c.name}</option>)}
                    </Select>
                    <Input label="Difficulty" type="number" min="1" max="10" value={demandForm.difficulty} onChange={e => setDemandForm(f => ({ ...f, difficulty: e.target.value }))} />
                    <Input label="Bar range" value={demandForm.bar_range} onChange={e => setDemandForm(f => ({ ...f, bar_range: e.target.value }))} placeholder="e.g. 45-72" />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="secondary" size="sm" onClick={() => setShowDemandForm(false)}>Cancel</Button>
                    <Button size="sm" onClick={addDemand} disabled={!demandForm.description.trim()}>Add Demand</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Piece Details */}
          <Card>
            <CardHeader><h2 className="text-base font-semibold">Piece Details</h2></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-[var(--pf-text-secondary)]">Composer</span><span>{piece.composer || '—'}</span></div>
              <div className="flex justify-between"><span className="text-[var(--pf-text-secondary)]">Difficulty</span><DifficultyDots value={piece.difficulty} /></div>
              <div className="flex justify-between"><span className="text-[var(--pf-text-secondary)]">Priority</span><Badge color={piece.priority === 'high' ? 'var(--pf-status-needs-work)' : piece.priority === 'medium' ? 'var(--pf-accent-gold)' : 'var(--pf-text-secondary)'}>{priorityConf.label}</Badge></div>
              {piece.target_date && (
                <div className="flex justify-between"><span className="text-[var(--pf-text-secondary)]">Target</span><span>{new Date(piece.target_date).toLocaleDateString()} {daysUntil != null && `(${daysUntil}d)`}</span></div>
              )}
              <div className="flex justify-between"><span className="text-[var(--pf-text-secondary)]">Status</span><StatusIndicator {...statusConf} size="sm" /></div>
            </CardContent>
          </Card>

          {/* Sections */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Sections</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowSectionForm(true)}><Plus size={14} /></Button>
              </div>
            </CardHeader>
            <CardContent>
              {piece.sections.length === 0 && !showSectionForm && (
                <p className="text-sm text-[var(--pf-text-secondary)]">No sections yet.</p>
              )}
              <div className="space-y-2">
                {piece.sections.map(s => {
                  const sConf = SECTION_STATUS_CONFIG[s.status];
                  return (
                    <div key={s.id} className="flex items-center gap-2 group">
                      <StatusIndicator {...sConf} size="sm" />
                      <span className="flex-1 text-sm">{s.name}</span>
                      {s.bar_range && <span className="text-xs text-[var(--pf-text-secondary)]">{s.bar_range}</span>}
                      <select
                        value={s.status}
                        onChange={e => updateSectionStatus(s.id, e.target.value as SectionStatus)}
                        className="text-xs bg-transparent border-none text-[var(--pf-text-secondary)] cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <option value="not_started">Not started</option>
                        <option value="working_on">Working on</option>
                        <option value="solid">Solid</option>
                        <option value="polished">Polished</option>
                      </select>
                      <button onClick={() => deleteSection(s.id)} className="p-0.5 text-[var(--pf-text-secondary)] opacity-0 group-hover:opacity-100 hover:text-[var(--pf-status-needs-work)]"><Trash2 size={12} /></button>
                    </div>
                  );
                })}
              </div>
              {showSectionForm && (
                <div className="mt-3 p-3 border border-[var(--pf-border-color)] rounded-pf-sm space-y-2">
                  <Input value={sectionForm.name} onChange={e => setSectionForm(f => ({ ...f, name: e.target.value }))} placeholder="Section name" />
                  <Input value={sectionForm.bar_range} onChange={e => setSectionForm(f => ({ ...f, bar_range: e.target.value }))} placeholder="Bar range (e.g. 1-67)" />
                  <div className="flex gap-2 justify-end">
                    <Button variant="secondary" size="sm" onClick={() => setShowSectionForm(false)}>Cancel</Button>
                    <Button size="sm" onClick={addSection} disabled={!sectionForm.name.trim()}>Add</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          {/* Linked Files */}
          <Card>
            <CardHeader><h2 className="text-base font-semibold">Files</h2></CardHeader>
            <CardContent>
              <LinkedFiles linkedType="piece" linkedId={piece.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
