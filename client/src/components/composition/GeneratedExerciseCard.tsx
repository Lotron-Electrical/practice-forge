import { useState } from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { AbcNotationViewer } from './AbcNotationViewer';
import { api } from '../../api/client';
import type { GeneratedExercise, TaxonomyCategory } from '../../core/types';
import { Save, Sparkles, Settings, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  exercise: GeneratedExercise;
  categories?: TaxonomyCategory[];
  demandId?: string;
  onSaved?: () => void;
}

export function GeneratedExerciseCard({ exercise, categories = [], demandId, onSaved }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [categoryId, setCategoryId] = useState('');

  // Try to auto-match category from hint
  const autoCategory = exercise.category_hint
    ? categories.find(c => c.name.toLowerCase().includes(exercise.category_hint!.toLowerCase()))
    : null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveGeneratedExercise({
        title: exercise.title,
        abc: exercise.abc,
        description: exercise.description,
        key: exercise.key,
        difficulty: exercise.difficulty,
        tags: exercise.tags,
        category_id: categoryId || autoCategory?.id || null,
        generation_method: exercise.generation_method || 'rule_based',
        prompt_used: exercise.prompt_used || null,
        demand_id: demandId || null,
      });
      setSaved(true);
      onSaved?.();
    } catch {
      // Error handled silently
    } finally {
      setSaving(false);
    }
  };

  const isAi = exercise.generation_method === 'claude_api';

  return (
    <Card borderColor={isAi ? 'var(--pf-accent-gold)' : 'var(--pf-accent-teal)'}>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              {isAi ? <Sparkles size={14} className="text-[var(--pf-accent-gold)]" /> : <Settings size={14} className="text-[var(--pf-accent-teal)]" />}
              <h3 className="font-semibold text-sm">{exercise.title}</h3>
            </div>
            <p className="text-xs text-[var(--pf-text-secondary)] mt-0.5">{exercise.description}</p>
          </div>
          <button onClick={() => setExpanded(!expanded)} className="text-[var(--pf-text-secondary)]">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge color={isAi ? 'var(--pf-accent-gold)' : 'var(--pf-accent-teal)'}>{isAi ? 'AI' : 'Rule'}</Badge>
          {exercise.key && <Badge color="var(--pf-accent-lavender)">{exercise.key}</Badge>}
          {exercise.difficulty && <span className="text-xs text-[var(--pf-text-secondary)]">{exercise.difficulty}/10</span>}
          {exercise.tags.map(t => (
            <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-[var(--pf-bg-hover)] text-[var(--pf-text-secondary)]">{t}</span>
          ))}
        </div>

        {expanded && (
          <>
            <AbcNotationViewer abc={exercise.abc} />

            {!saved && (
              <div className="flex items-center gap-3 pt-2 border-t border-[var(--pf-border-color)]">
                <select
                  value={categoryId || autoCategory?.id || ''}
                  onChange={e => setCategoryId(e.target.value)}
                  className="text-xs px-2 py-1 rounded border border-[var(--pf-border-color)] bg-[var(--pf-bg-primary)] text-[var(--pf-text-primary)]"
                >
                  <option value="">Category (optional)</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.parent_id ? '  ' : ''}{c.name}</option>)}
                </select>
                <div className="flex-1" />
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  <Save size={14} /> {saving ? 'Saving...' : 'Save to Library'}
                </Button>
              </div>
            )}

            {saved && (
              <div className="text-xs text-center py-2" style={{ color: 'var(--pf-status-ready)' }}>
                Saved to Exercise Library
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
