import { Card, CardContent, CardHeader } from '../ui/Card';
import type { AnalysisData } from '../../core/types';
import { Waves, Triangle, Repeat } from 'lucide-react';

interface PatternsPanelProps {
  data: AnalysisData;
  onPatternClick?: (type: string, barRange: string) => void;
}

export function PatternsPanel({ data, onPatternClick }: PatternsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-base font-semibold">Patterns</h3>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scales */}
        {data.scales.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Waves size={14} style={{ color: '#3b82f6' }} />
              <span className="text-xs font-medium text-[var(--pf-text-secondary)]">Scales ({data.scales.length})</span>
            </div>
            <div className="space-y-1">
              {data.scales.map((s, i) => (
                <button
                  key={i}
                  onClick={() => onPatternClick?.('scale', s.bar_range)}
                  className="w-full text-left px-2 py-1.5 text-xs rounded-pf-sm hover:bg-[var(--pf-bg-hover)] flex justify-between"
                >
                  <span>{s.key} {s.scale_type}</span>
                  <span className="text-[var(--pf-text-secondary)]">bars {s.bar_range}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Arpeggios */}
        {data.arpeggios.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Triangle size={14} style={{ color: '#22c55e' }} />
              <span className="text-xs font-medium text-[var(--pf-text-secondary)]">Arpeggios ({data.arpeggios.length})</span>
            </div>
            <div className="space-y-1">
              {data.arpeggios.map((a, i) => (
                <button
                  key={i}
                  onClick={() => onPatternClick?.('arpeggio', a.bar_range)}
                  className="w-full text-left px-2 py-1.5 text-xs rounded-pf-sm hover:bg-[var(--pf-bg-hover)] flex justify-between"
                >
                  <span>{a.key} {a.chord_type}</span>
                  <span className="text-[var(--pf-text-secondary)]">bars {a.bar_range}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Motifs/Patterns */}
        {data.patterns.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Repeat size={14} style={{ color: 'var(--pf-accent-gold)' }} />
              <span className="text-xs font-medium text-[var(--pf-text-secondary)]">Motifs ({data.patterns.length})</span>
            </div>
            <div className="space-y-1">
              {data.patterns.map((p, i) => (
                <button
                  key={i}
                  onClick={() => onPatternClick?.(p.pattern_type, p.bar_range)}
                  className="w-full text-left px-2 py-1.5 text-xs rounded-pf-sm hover:bg-[var(--pf-bg-hover)] flex justify-between"
                >
                  <span>{p.description}</span>
                  <span className="text-[var(--pf-text-secondary)]">{p.occurrences}x</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {data.scales.length === 0 && data.arpeggios.length === 0 && data.patterns.length === 0 && (
          <p className="text-sm text-[var(--pf-text-secondary)]">No patterns detected.</p>
        )}
      </CardContent>
    </Card>
  );
}
