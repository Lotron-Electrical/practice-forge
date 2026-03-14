import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusIndicator } from '../components/ui/StatusIndicator';
import { DifficultyDots } from '../components/ui/DifficultyDots';
import { Badge } from '../components/ui/Badge';
import { PIECE_STATUS_CONFIG, PRIORITY_CONFIG } from '../core/constants';
import { api } from '../api/client';
import type { Piece, PieceStatus, Priority } from '../core/types';
import { Plus, Music, Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { useExperienceLevel } from '../hooks/useExperienceLevel';

export function PiecesPage() {
  const navigate = useNavigate();
  const { level } = useExperienceLevel();
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', composer: '' });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('title');
  const [showFilters, setShowFilters] = useState(level !== 'beginner');

  const load = () => api.getPieces().then(d => setPieces(d as Piece[])).catch(() => {});
  useEffect(() => { load(); }, []);

  const filteredPieces = useMemo(() => {
    const filtered = pieces.filter(p => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!p.title.toLowerCase().includes(q) && !p.composer.toLowerCase().includes(q)) return false;
      }
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && p.priority !== priorityFilter) return false;
      return true;
    });

    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'composer':
          return a.composer.localeCompare(b.composer);
        case 'difficulty':
          return (b.difficulty ?? 0) - (a.difficulty ?? 0);
        case 'date_added':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'target_date': {
          if (!a.target_date && !b.target_date) return 0;
          if (!a.target_date) return 1;
          if (!b.target_date) return -1;
          return new Date(a.target_date).getTime() - new Date(b.target_date).getTime();
        }
        case 'priority':
          return (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1);
        default:
          return 0;
      }
    });

    return filtered;
  }, [pieces, searchQuery, statusFilter, priorityFilter, sortBy]);

  const handleCreate = async () => {
    const result = await api.createPiece({
      title: form.title,
      composer: form.composer,
      difficulty: null,
      status: 'not_started' as PieceStatus,
      priority: 'medium' as Priority,
      target_date: null,
      general_notes: '',
    });
    setShowCreate(false);
    setForm({ title: '', composer: '' });
    if (result && (result as any).id) {
      navigate(`/pieces/${(result as any).id}`);
    } else {
      load();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Pieces</h1>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Add Piece
        </Button>
      </div>

      {/* Search and filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--pf-text-secondary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search pieces..."
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
              <option value="not_started">Not started</option>
              <option value="in_progress">In progress</option>
              <option value="performance_ready">Performance ready</option>
              <option value="archived">Archived</option>
            </select>
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[var(--pf-border-color)] bg-[var(--pf-bg-primary)] text-[var(--pf-text-primary)] text-sm"
            >
              <option value="all">All priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[var(--pf-border-color)] bg-[var(--pf-bg-primary)] text-[var(--pf-text-primary)] text-sm"
            >
              <option value="title">Sort: Title</option>
              <option value="composer">Sort: Composer</option>
              <option value="difficulty">Sort: Difficulty</option>
              <option value="date_added">Sort: Date Added</option>
              <option value="target_date">Sort: Target Date</option>
              <option value="priority">Sort: Priority</option>
            </select>
          </>
        )}
      </div>

      {/* Simplified create form — title + composer only */}
      {showCreate && (
        <Card className="mb-6">
          <CardContent className="space-y-4">
            <h2 className="text-lg font-semibold">New Piece</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Mozart Flute Concerto No. 1 in G major, K. 313" />
              <Input label="Composer" value={form.composer} onChange={e => setForm(f => ({ ...f, composer: e.target.value }))} placeholder="e.g. W.A. Mozart" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreate} disabled={!form.title.trim()}>Create Piece</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Piece list */}
      {filteredPieces.length === 0 && !showCreate ? (
        <Card>
          <CardContent className="text-center py-12">
            <Music size={48} className="mx-auto mb-4 text-[var(--pf-text-secondary)]" />
            <p className="text-[var(--pf-text-secondary)]">
              {pieces.length === 0
                ? 'No pieces yet. Add your first piece to start tracking sections, tricky spots, and practice time.'
                : 'No pieces match your filters.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPieces.map(piece => {
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
                  <CardContent className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <span className="font-semibold">{piece.title}</span>
                        <Badge color={priorityConf.label === 'High' ? 'var(--pf-status-needs-work)' : priorityConf.label === 'Medium' ? 'var(--pf-accent-gold)' : 'var(--pf-text-secondary)'}>{priorityConf.label}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-[var(--pf-text-secondary)] flex-wrap">
                        <span>{piece.composer}</span>
                        <DifficultyDots value={piece.difficulty} />
                        <span>{piece.sections.length} sections</span>
                        <span>{piece.technical_demands.length} tricky spots</span>
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
