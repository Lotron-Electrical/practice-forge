import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { api } from '../../api/client';
import type { AudioRecording } from '../../core/types';
import { Mic, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  linkedType?: string;
  linkedId?: string;
  sessionId?: string;
  refreshKey?: number;
}

function formatDuration(secs: number | null): string {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function pitchBadgeColor(pct: number | null | undefined): string {
  if (pct == null) return 'var(--pf-text-secondary)';
  if (pct >= 80) return 'var(--pf-status-ready)';
  if (pct >= 60) return 'var(--pf-accent-gold)';
  return 'var(--pf-status-needs-work)';
}

export function RecordingsList({ linkedType, linkedId, sessionId, refreshKey }: Props) {
  const [recordings, setRecordings] = useState<AudioRecording[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(() => {
    const params: Record<string, string> = {};
    if (linkedType) params.linked_type = linkedType;
    if (linkedId) params.linked_id = linkedId;
    if (sessionId) params.session_id = sessionId;
    api.getRecordings(params).then(data => setRecordings(data as AudioRecording[])).catch(() => {});
  }, [linkedType, linkedId, sessionId]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const handleDelete = async (id: string) => {
    await api.deleteRecording(id);
    load();
  };

  if (recordings.length === 0) {
    return (
      <div className="text-xs text-[var(--pf-text-secondary)] flex items-center gap-2 py-2">
        <Mic size={12} /> No recordings yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {recordings.map(rec => {
        const isExpanded = expandedId === rec.id;
        return (
          <Card key={rec.id} className="overflow-hidden">
            <CardContent className="py-2">
              <button
                className="w-full flex items-center gap-3 text-left"
                onClick={() => setExpandedId(isExpanded ? null : rec.id)}
              >
                <Mic size={14} className="text-[var(--pf-text-secondary)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {rec.title || rec.original_filename || 'Untitled recording'}
                  </div>
                  <div className="text-xs text-[var(--pf-text-secondary)]">
                    {new Date(rec.created_at).toLocaleDateString()} · {formatDuration(rec.duration_seconds)}
                  </div>
                </div>
                {rec.pitch_accuracy_pct != null && (
                  <Badge color={pitchBadgeColor(rec.pitch_accuracy_pct)}>
                    {rec.pitch_accuracy_pct}%
                  </Badge>
                )}
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-[var(--pf-border-color)] space-y-2">
                  {rec.file_id && (
                    <audio controls src={api.getRecordingAudioUrl(rec.file_id)} className="w-full h-8" />
                  )}
                  {rec.analysis_rating && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-[var(--pf-text-secondary)]">Rating:</span>
                      <Badge color={
                        rec.analysis_rating === 'excellent' ? 'var(--pf-status-ready)' :
                          rec.analysis_rating === 'solid' ? 'var(--pf-status-in-progress)' :
                            rec.analysis_rating === 'acceptable' ? 'var(--pf-accent-gold)' : 'var(--pf-status-needs-work)'
                      }>
                        {rec.analysis_rating}
                      </Badge>
                    </div>
                  )}
                  <div className="flex justify-end">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(rec.id); }}
                      className="text-xs text-[var(--pf-text-secondary)] hover:text-[var(--pf-status-needs-work)] flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
