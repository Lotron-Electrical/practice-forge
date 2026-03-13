import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusIndicator } from '../components/ui/StatusIndicator';
import { DifficultyDots } from '../components/ui/DifficultyDots';
import { Badge } from '../components/ui/Badge';
import { PIECE_STATUS_CONFIG, PRIORITY_CONFIG } from '../core/constants';
import { api } from '../api/client';
import type { Piece, PieceStatus, Priority } from '../core/types';
import { Plus, Music } from 'lucide-react';
import { Input, Textarea, Select } from '../components/ui/Input';

export function PiecesPage() {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', composer: '', difficulty: '', status: 'not_started' as PieceStatus, priority: 'medium' as Priority, target_date: '', general_notes: '' });

  const load = () => api.getPieces().then(d => setPieces(d as Piece[])).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    await api.createPiece({
      ...form,
      difficulty: form.difficulty ? Number(form.difficulty) : null,
      target_date: form.target_date || null,
    });
    setShowCreate(false);
    setForm({ title: '', composer: '', difficulty: '', status: 'not_started', priority: 'medium', target_date: '', general_notes: '' });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Pieces</h1>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Add Piece
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <Card className="mb-6">
          <CardContent className="space-y-4">
            <h2 className="text-lg font-semibold">New Piece</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Mozart Flute Concerto No. 1 in G major, K. 313" />
              <Input label="Composer" value={form.composer} onChange={e => setForm(f => ({ ...f, composer: e.target.value }))} placeholder="e.g. W.A. Mozart" />
              <Input label="Difficulty (1-10)" type="number" min="1" max="10" value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))} />
              <Select label="Priority" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </Select>
              <Input label="Target date" type="date" value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} />
              <Select label="Status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as PieceStatus }))}>
                <option value="not_started">Not started</option>
                <option value="in_progress">In progress</option>
                <option value="performance_ready">Performance ready</option>
              </Select>
            </div>
            <Textarea label="Notes" value={form.general_notes} onChange={e => setForm(f => ({ ...f, general_notes: e.target.value }))} />
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreate} disabled={!form.title.trim()}>Create Piece</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Piece list */}
      {pieces.length === 0 && !showCreate ? (
        <Card>
          <CardContent className="text-center py-12">
            <Music size={48} className="mx-auto mb-4 text-[var(--pf-text-secondary)]" />
            <p className="text-[var(--pf-text-secondary)]">No pieces yet. Click "Add Piece" to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pieces.map(piece => {
            const statusConf = PIECE_STATUS_CONFIG[piece.status];
            const priorityConf = PRIORITY_CONFIG[piece.priority];
            const daysUntil = piece.target_date
              ? Math.ceil((new Date(piece.target_date).getTime() - Date.now()) / 86400000)
              : null;

            return (
              <Link key={piece.id} to={`/pieces/${piece.id}`}>
                <Card
                  borderColor={`var(${statusConf.colorVar})`}
                  className="hover:shadow-pf-lg transition-shadow cursor-pointer"
                >
                  <CardContent className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold">{piece.title}</span>
                        <Badge color={priorityConf.label === 'High' ? 'var(--pf-status-needs-work)' : priorityConf.label === 'Medium' ? 'var(--pf-accent-gold)' : 'var(--pf-text-secondary)'}>{priorityConf.label}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-[var(--pf-text-secondary)]">
                        <span>{piece.composer}</span>
                        <DifficultyDots value={piece.difficulty} />
                        <span>{piece.sections.length} sections</span>
                        <span>{piece.technical_demands.length} demands</span>
                      </div>
                    </div>
                    {/* Section progress */}
                    {piece.sections.length > 0 && (
                      <div className="flex gap-0.5 w-24">
                        {piece.sections.map(s => {
                          const cv = s.status === 'polished' ? '--pf-status-ready' : s.status === 'solid' ? '--pf-status-solid' : s.status === 'working_on' ? '--pf-status-in-progress' : '--pf-status-not-started';
                          return <div key={s.id} className="flex-1 h-2 rounded-full" style={{ backgroundColor: `var(${cv})` }} />;
                        })}
                      </div>
                    )}
                    <StatusIndicator {...statusConf} />
                    {daysUntil != null && (
                      <span className={`text-sm font-medium ${daysUntil <= 7 ? 'text-[var(--pf-status-needs-work)]' : 'text-[var(--pf-text-secondary)]'}`}>
                        {daysUntil > 0 ? `${daysUntil} days` : daysUntil === 0 ? 'Today' : 'Overdue'}
                      </span>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
