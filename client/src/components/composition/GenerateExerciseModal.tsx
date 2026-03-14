import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Select, Textarea } from '../ui/Input';
import { AiCostConfirm } from '../ui/AiCostConfirm';
import { GeneratedExerciseCard } from './GeneratedExerciseCard';
import { api } from '../../api/client';
import type { GeneratedExercise, TaxonomyCategory, GenerationType, RuleGenerationParams } from '../../core/types';
import { MUSICAL_KEYS } from '../../core/constants';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { Sparkles, Settings, X, Loader } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  demandId?: string;
  demandDescription?: string;
  initialKey?: string;
  onSaved?: () => void;
}

const SCALE_TYPES = [
  { value: 'major', label: 'Major' },
  { value: 'minor', label: 'Natural Minor' },
  { value: 'harmonic_minor', label: 'Harmonic Minor' },
  { value: 'melodic_minor', label: 'Melodic Minor' },
  { value: 'chromatic', label: 'Chromatic' },
  { value: 'whole_tone', label: 'Whole Tone' },
  { value: 'pentatonic', label: 'Pentatonic' },
];

const CHORD_TYPES = [
  { value: 'major', label: 'Major' },
  { value: 'minor', label: 'Minor' },
  { value: 'diminished', label: 'Diminished' },
  { value: 'augmented', label: 'Augmented' },
  { value: 'dominant7', label: 'Dominant 7th' },
  { value: 'major7', label: 'Major 7th' },
  { value: 'minor7', label: 'Minor 7th' },
];

const INTERVALS = [
  { value: 'third', label: 'Third' },
  { value: 'fourth', label: 'Fourth' },
  { value: 'fifth', label: 'Fifth' },
  { value: 'sixth', label: 'Sixth' },
  { value: 'octave', label: 'Octave' },
];

const ARTICULATIONS = [
  { value: 'staccato', label: 'Staccato' },
  { value: 'legato', label: 'Legato' },
  { value: 'double_tongue', label: 'Double Tonguing' },
  { value: 'triple_tongue', label: 'Triple Tonguing' },
];

type Tab = 'rule' | 'ai';

export function GenerateExerciseModal({ open, onClose, demandId, demandDescription, initialKey, onSaved }: Props) {
  const [tab, setTab] = useState<Tab>('rule');
  const [categories, setCategories] = useState<TaxonomyCategory[]>([]);
  const [result, setResult] = useState<GeneratedExercise | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCostConfirm, setShowCostConfirm] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState('');
  const [pendingAiRequest, setPendingAiRequest] = useState<{ type: string; prompt: string; context: unknown } | null>(null);

  // Rule-based form state
  const [ruleType, setRuleType] = useState<GenerationType>('scale');
  const [ruleKey, setRuleKey] = useState(initialKey || 'C');
  const [ruleScaleType, setRuleScaleType] = useState('major');
  const [ruleChordType, setRuleChordType] = useState('major');
  const [ruleInterval, setRuleInterval] = useState('third');
  const [ruleArticulation, setRuleArticulation] = useState('staccato');
  const [ruleOctaves, setRuleOctaves] = useState(2);
  const [ruleTempo, setRuleTempo] = useState(80);
  const [rulePattern, setRulePattern] = useState('straight');

  // AI form state
  const [aiType, setAiType] = useState('custom_study');
  const [aiPrompt, setAiPrompt] = useState(demandDescription || '');

  useEffect(() => {
    api.getTaxonomy().then(d => setCategories(d as TaxonomyCategory[])).catch(() => {});
  }, []);

  useEffect(() => {
    if (demandDescription) setAiPrompt(demandDescription);
    if (initialKey) setRuleKey(initialKey);
  }, [demandDescription, initialKey]);

  const focusTrapRef = useFocusTrap(open, onClose);

  if (!open) return null;

  const handleRuleGenerate = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const params: RuleGenerationParams = { key: ruleKey, tempo: ruleTempo, octaves: ruleOctaves };
      if (ruleType === 'scale') { params.scaleType = ruleScaleType; params.pattern = rulePattern; }
      if (ruleType === 'arpeggio') { params.chordType = ruleChordType; }
      if (ruleType === 'interval') { params.interval = ruleInterval; }
      if (ruleType === 'articulation') { params.articulation = ruleArticulation; }

      const data = await api.generateRule(ruleType, params) as GeneratedExercise;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemandGenerate = async () => {
    if (!demandId) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await api.generateFromDemand(demandId) as GeneratedExercise;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAiGenerate = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const context: Record<string, unknown> = { key: ruleKey };
      if (demandId) context.demand_id = demandId;

      const data = await api.generateAi(aiType, aiPrompt, context) as any;
      if (data.requires_confirmation) {
        setEstimatedCost(data.estimated_cost || 'Unknown');
        setPendingAiRequest({ type: aiType, prompt: aiPrompt, context });
        setShowCostConfirm(true);
        setLoading(false);
        return;
      }
      setResult(data as GeneratedExercise);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const confirmAiGenerate = async () => {
    if (!pendingAiRequest) return;
    setShowCostConfirm(false);
    setLoading(true);
    try {
      const data = await api.generateAi(pendingAiRequest.type, pendingAiRequest.prompt, pendingAiRequest.context, true) as GeneratedExercise;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
      setPendingAiRequest(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Generate Exercise">
      <div ref={focusTrapRef} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Generate Exercise</h2>
              <button onClick={onClose} aria-label="Close" className="text-[var(--pf-text-secondary)] hover:text-[var(--pf-text-primary)]">
                <X size={18} />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tab selector */}
            <div className="flex gap-2">
              <button
                onClick={() => setTab('rule')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-pf text-sm font-medium transition-colors ${
                  tab === 'rule' ? 'text-white' : 'text-[var(--pf-text-secondary)] border border-[var(--pf-border-color)]'
                }`}
                style={tab === 'rule' ? { backgroundColor: 'var(--pf-accent-teal)' } : undefined}
              >
                <Settings size={14} /> Rule-based
              </button>
              <button
                onClick={() => setTab('ai')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-pf text-sm font-medium transition-colors ${
                  tab === 'ai' ? 'text-white' : 'text-[var(--pf-text-secondary)] border border-[var(--pf-border-color)]'
                }`}
                style={tab === 'ai' ? { backgroundColor: 'var(--pf-accent-gold)' } : undefined}
              >
                <Sparkles size={14} /> AI-assisted
              </button>
              {demandId && (
                <Button variant="secondary" size="sm" onClick={handleDemandGenerate} disabled={loading}>
                  Auto from demand
                </Button>
              )}
            </div>

            {/* Rule-based form */}
            {tab === 'rule' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select label="Exercise type" value={ruleType} onChange={e => setRuleType(e.target.value as GenerationType)}>
                    <option value="scale">Scale</option>
                    <option value="arpeggio">Arpeggio</option>
                    <option value="interval">Interval Drill</option>
                    <option value="articulation">Articulation</option>
                  </Select>
                  <Select label="Key" value={ruleKey} onChange={e => setRuleKey(e.target.value)}>
                    {MUSICAL_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                  </Select>
                </div>

                {ruleType === 'scale' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Select label="Scale type" value={ruleScaleType} onChange={e => setRuleScaleType(e.target.value)}>
                      {SCALE_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </Select>
                    <Select label="Pattern" value={rulePattern} onChange={e => setRulePattern(e.target.value)}>
                      <option value="straight">Straight</option>
                      <option value="thirds">In thirds</option>
                    </Select>
                  </div>
                )}

                {ruleType === 'arpeggio' && (
                  <Select label="Chord type" value={ruleChordType} onChange={e => setRuleChordType(e.target.value)}>
                    {CHORD_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </Select>
                )}

                {ruleType === 'interval' && (
                  <Select label="Interval" value={ruleInterval} onChange={e => setRuleInterval(e.target.value)}>
                    {INTERVALS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                  </Select>
                )}

                {ruleType === 'articulation' && (
                  <Select label="Articulation" value={ruleArticulation} onChange={e => setRuleArticulation(e.target.value)}>
                    {ARTICULATIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </Select>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label="Octaves" type="number" min={1} max={3} value={ruleOctaves} onChange={e => setRuleOctaves(parseInt(e.target.value) || 2)} />
                  <Input label="Tempo (BPM)" type="number" min={30} max={200} value={ruleTempo} onChange={e => setRuleTempo(parseInt(e.target.value) || 80)} />
                </div>

                <Button onClick={handleRuleGenerate} disabled={loading}>
                  {loading ? <><Loader size={14} className="animate-spin" /> Generating...</> : <><Settings size={14} /> Generate</>}
                </Button>
              </div>
            )}

            {/* AI form */}
            {tab === 'ai' && (
              <div className="space-y-3">
                <Select label="Generation type" value={aiType} onChange={e => setAiType(e.target.value)}>
                  <option value="custom_study">Custom Technical Study</option>
                  <option value="excerpt_prep">Excerpt Preparation Routine</option>
                  <option value="warmup">Warm-up Routine</option>
                  <option value="variation">Variation of Existing Exercise</option>
                </Select>
                <Textarea
                  label="Describe what you need"
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  placeholder="e.g. I need a warm-up for high register staccato in Eb"
                  rows={3}
                />
                <Select label="Key" value={ruleKey} onChange={e => setRuleKey(e.target.value)}>
                  <option value="">Auto</option>
                  {MUSICAL_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                </Select>
                <div className="flex items-center gap-2">
                  <Button onClick={handleAiGenerate} disabled={loading || !aiPrompt.trim()}>
                    {loading ? <><Loader size={14} className="animate-spin" /> Generating...</> : <><Sparkles size={14} /> Generate with AI</>}
                  </Button>
                  <span className="text-xs text-[var(--pf-text-secondary)]">Uses Claude API (paid)</span>
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm" style={{ color: 'var(--pf-status-needs-work)' }}>{error}</p>
            )}

            {/* Result */}
            {result && (
              <GeneratedExerciseCard
                exercise={result}
                categories={categories}
                demandId={demandId}
                onSaved={() => { onSaved?.(); }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {showCostConfirm && (
        <AiCostConfirm
          estimatedCost={estimatedCost}
          description="Generate exercise using Claude AI"
          onConfirm={confirmAiGenerate}
          onCancel={() => { setShowCostConfirm(false); setLoading(false); }}
        />
      )}
    </div>
  );
}
