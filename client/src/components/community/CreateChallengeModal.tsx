import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Input';
import { api } from '../../api/client';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useModalLock } from '../../hooks/useModalLock';
import type { ChallengeType, Excerpt } from '../../core/types';
import { Swords, Zap, Eye, Timer, Target, Calendar, X, Search, Loader, Plus, Trash2 } from 'lucide-react';

const CHALLENGE_TYPES: { type: ChallengeType; icon: typeof Swords; label: string }[] = [
  { type: 'excerpt_duel', icon: Swords, label: 'Excerpt Duel' },
  { type: 'scale_sprint', icon: Zap, label: 'Scale Sprint' },
  { type: 'sight_reading', icon: Eye, label: 'Sight-Reading Race' },
  { type: 'practice_marathon', icon: Timer, label: 'Practice Marathon' },
  { type: 'technique_showdown', icon: Target, label: 'Technique Showdown' },
  { type: 'weekly', icon: Calendar, label: 'Weekly Challenge' },
];

const DEADLINE_OPTIONS = [
  { label: '1 day', days: 1 },
  { label: '3 days', days: 3 },
  { label: '5 days', days: 5 },
  { label: '7 days', days: 7 },
];

const SCALE_TYPES = ['major', 'natural_minor', 'harmonic_minor', 'melodic_minor', 'chromatic', 'whole_tone'];
const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateChallengeModal({ open, onClose, onCreated }: Props) {
  const modalRef = useFocusTrap(open);
  useModalLock(open);
  const [challengeType, setChallengeType] = useState<ChallengeType | null>(null);
  const [description, setDescription] = useState('');
  const [deadlineDays, setDeadlineDays] = useState(3);
  const [opponents, setOpponents] = useState<{ id: string; display_name: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; display_name: string; instrument?: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);

  // Excerpt duel extras
  const [excerpts, setExcerpts] = useState<Excerpt[]>([]);
  const [selectedExcerpt, setSelectedExcerpt] = useState('');

  // Scale sprint extras
  const [scaleKey, setScaleKey] = useState('C');
  const [scaleType, setScaleType] = useState('major');

  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (open && challengeType === 'excerpt_duel') {
      api.getExcerpts().then(d => setExcerpts(d as Excerpt[])).catch(() => {});
    }
  }, [open, challengeType]);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await api.searchUsers(searchQuery) as { id: string; display_name: string; instrument?: string }[];
        setSearchResults(results.filter(r => !opponents.some(o => o.id === r.id)));
      } catch { setSearchResults([]); }
      setSearching(false);
    }, 300);
    return () => clearTimeout(searchTimeout.current);
  }, [searchQuery, opponents]);

  const handleCreate = async () => {
    if (!challengeType || !description.trim()) return;
    setCreating(true);
    try {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + deadlineDays);

      const payload: Record<string, unknown> = {
        type: challengeType,
        description: description.trim(),
        deadline: deadline.toISOString(),
        participant_user_ids: opponents.map(o => o.id),
      };

      if (challengeType === 'excerpt_duel' && selectedExcerpt) {
        payload.content_type = 'excerpt';
        payload.content_id = selectedExcerpt;
      }
      if (challengeType === 'scale_sprint') {
        payload.description = `${scaleKey} ${scaleType.replace('_', ' ')} — ${description.trim()}`;
      }

      await api.createChallenge(payload);
      onCreated();
      handleClose();
    } catch {}
    setCreating(false);
  };

  const handleClose = () => {
    setChallengeType(null);
    setDescription('');
    setDeadlineDays(3);
    setOpponents([]);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedExcerpt('');
    setScaleKey('C');
    setScaleType('major');
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
      <div
        ref={modalRef}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto m-4"
        onClick={e => e.stopPropagation()}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h2 className="text-lg font-bold">Create Challenge</h2>
            <button onClick={handleClose} className="p-1 hover:bg-[var(--pf-bg-hover)] rounded-pf-sm">
              <X size={18} />
            </button>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Challenge type selector */}
            <div>
              <label className="text-sm font-medium text-[var(--pf-text-secondary)] mb-2 block">Challenge Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CHALLENGE_TYPES.map(({ type, icon: Icon, label }) => (
                  <button
                    key={type}
                    onClick={() => setChallengeType(type)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-pf border text-xs font-medium transition-colors ${
                      challengeType === type
                        ? 'border-[var(--pf-accent-teal)] bg-[var(--pf-accent-teal)]/10 text-[var(--pf-accent-teal)]'
                        : 'border-[var(--pf-border-color)] hover:bg-[var(--pf-bg-hover)] text-[var(--pf-text-secondary)]'
                    }`}
                  >
                    <Icon size={20} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Excerpt duel: select excerpt */}
            {challengeType === 'excerpt_duel' && (
              <div>
                <label className="text-sm font-medium text-[var(--pf-text-secondary)] mb-1 block">Excerpt</label>
                <select
                  value={selectedExcerpt}
                  onChange={e => setSelectedExcerpt(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-pf-sm border border-[var(--pf-border-color)] bg-[var(--pf-bg-input)] text-[var(--pf-text-primary)]"
                >
                  <option value="">Select excerpt...</option>
                  {excerpts.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.title} — {ex.composer}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Scale sprint: key + type */}
            {challengeType === 'scale_sprint' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-[var(--pf-text-secondary)] mb-1 block">Key</label>
                  <select
                    value={scaleKey}
                    onChange={e => setScaleKey(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-pf-sm border border-[var(--pf-border-color)] bg-[var(--pf-bg-input)] text-[var(--pf-text-primary)]"
                  >
                    {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-[var(--pf-text-secondary)] mb-1 block">Scale Type</label>
                  <select
                    value={scaleType}
                    onChange={e => setScaleType(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-pf-sm border border-[var(--pf-border-color)] bg-[var(--pf-bg-input)] text-[var(--pf-text-primary)]"
                  >
                    {SCALE_TYPES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Description */}
            <Textarea
              label="Description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the challenge..."
            />

            {/* Deadline */}
            <div>
              <label className="text-sm font-medium text-[var(--pf-text-secondary)] mb-2 block">Deadline</label>
              <div className="flex gap-2">
                {DEADLINE_OPTIONS.map(opt => (
                  <button
                    key={opt.days}
                    onClick={() => setDeadlineDays(opt.days)}
                    className={`flex-1 py-2 px-3 rounded-pf-sm text-sm font-medium border transition-colors ${
                      deadlineDays === opt.days
                        ? 'border-[var(--pf-accent-teal)] bg-[var(--pf-accent-teal)]/10 text-[var(--pf-accent-teal)]'
                        : 'border-[var(--pf-border-color)] hover:bg-[var(--pf-bg-hover)] text-[var(--pf-text-secondary)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Opponent search */}
            <div>
              <label className="text-sm font-medium text-[var(--pf-text-secondary)] mb-2 block">Invite Opponents</label>
              {opponents.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {opponents.map(o => (
                    <span
                      key={o.id}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-[var(--pf-accent-teal)]/10 text-[var(--pf-accent-teal)]"
                    >
                      {o.display_name}
                      <button onClick={() => setOpponents(prev => prev.filter(p => p.id !== o.id))}>
                        <Trash2 size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="relative">
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searching && (
                  <Loader size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--pf-text-secondary)]" />
                )}
              </div>
              {searchResults.length > 0 && (
                <div className="mt-1 border border-[var(--pf-border-color)] rounded-pf-sm overflow-hidden max-h-32 overflow-y-auto">
                  {searchResults.map(u => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setOpponents(prev => [...prev, { id: u.id, display_name: u.display_name }]);
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-[var(--pf-bg-hover)] transition-colors"
                    >
                      <Plus size={14} className="text-[var(--pf-accent-teal)]" />
                      <span>{u.display_name}</span>
                      {u.instrument && <span className="text-xs text-[var(--pf-text-secondary)]">{u.instrument}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Create button */}
            <Button
              className="w-full"
              onClick={handleCreate}
              disabled={!challengeType || !description.trim() || creating}
            >
              {creating ? <Loader size={14} className="animate-spin" /> : 'Create Challenge'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
