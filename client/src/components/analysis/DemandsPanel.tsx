import { useState } from 'react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import type { AnalysisDemand, Piece } from '../../core/types';
import { api } from '../../api/client';
import { Check, ArrowRight } from 'lucide-react';

interface DemandsPanelProps {
  demands: AnalysisDemand[];
  pieces: Piece[];
  onRefresh: () => void;
}

export function DemandsPanel({ demands, pieces, onRefresh }: DemandsPanelProps) {
  const [importingId, setImportingId] = useState<string | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<string>('');

  const handleImport = async (demandId: string) => {
    if (!selectedPiece) return;
    try {
      await api.importDemand(demandId, selectedPiece);
      onRefresh();
    } catch { /* handled */ }
    setImportingId(null);
  };

  const unimported = demands.filter(d => !d.imported);
  const imported = demands.filter(d => d.imported);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Detected Demands</h3>
          <span className="text-xs text-[var(--pf-text-secondary)]">{unimported.length} to review</span>
        </div>
      </CardHeader>
      <CardContent>
        {demands.length === 0 && (
          <p className="text-sm text-[var(--pf-text-secondary)]">No demands detected yet.</p>
        )}
        <div className="space-y-2">
          {unimported.map(d => (
            <div key={d.id} className="p-3 border border-[var(--pf-border-color)] rounded-pf-sm">
              <div className="flex items-start justify-between mb-1">
                <span className="text-sm font-medium">{d.description}</span>
                {d.confidence != null && (
                  <span className="text-xs text-[var(--pf-text-secondary)]">{Math.round(d.confidence * 100)}%</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--pf-text-secondary)]">
                {d.bar_range && <span>Bars {d.bar_range}</span>}
                {d.difficulty && <span>Difficulty {d.difficulty}/10</span>}
              </div>
              {importingId === d.id ? (
                <div className="flex items-center gap-2 mt-2">
                  <select
                    value={selectedPiece}
                    onChange={e => setSelectedPiece(e.target.value)}
                    className="flex-1 text-xs px-2 py-1 rounded-pf-sm border border-[var(--pf-border-color)] bg-[var(--pf-bg-input)]"
                  >
                    <option value="">Select piece...</option>
                    {pieces.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                  <Button size="sm" onClick={() => handleImport(d.id)} disabled={!selectedPiece}>
                    <ArrowRight size={12} /> Import
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setImportingId(d.id)} className="mt-2 text-xs">
                  Import to piece
                </Button>
              )}
            </div>
          ))}
          {imported.length > 0 && (
            <div className="mt-4 pt-3 border-t border-[var(--pf-border-color)]">
              <span className="text-xs font-medium text-[var(--pf-text-secondary)]">Imported ({imported.length})</span>
              {imported.map(d => (
                <div key={d.id} className="flex items-center gap-2 mt-2 text-sm text-[var(--pf-text-secondary)]">
                  <Check size={14} className="text-[var(--pf-status-solid)]" />
                  <span>{d.description}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
