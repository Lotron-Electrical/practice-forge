import type { UploadedFile } from '../../core/types';
import { FileMusic, FileAudio, Video, FileText, Pencil, Trash2, Download } from 'lucide-react';
import { api } from '../../api/client';

const TYPE_ICONS: Record<string, typeof FileMusic> = {
  sheet_music_digital: FileMusic,
  sheet_music_scanned: FileMusic,
  audio: FileAudio,
  video: Video,
  document: FileText,
};

const STATUS_COLORS: Record<string, string> = {
  complete: 'var(--pf-status-solid)',
  pending: 'var(--pf-accent-gold)',
  processing: 'var(--pf-accent-teal)',
  failed: 'var(--pf-status-needs-work)',
  needs_review: 'var(--pf-accent-lavender)',
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FileCardProps {
  file: UploadedFile;
  onEdit?: (file: UploadedFile) => void;
  onDelete?: (id: string) => void;
}

export function FileCard({ file, onEdit, onDelete }: FileCardProps) {
  const Icon = TYPE_ICONS[file.file_type] || FileText;
  const statusColor = STATUS_COLORS[file.processing_status] || 'var(--pf-text-secondary)';

  return (
    <div className="p-4 rounded-pf border border-[var(--pf-border-color)] bg-[var(--pf-bg-card)] hover:shadow-pf-lg transition-shadow group">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-pf-sm bg-[var(--pf-bg-hover)]">
          <Icon size={20} className="text-[var(--pf-text-secondary)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" title={file.original_filename}>{file.original_filename}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-[var(--pf-text-secondary)]">
            <span>{formatSize(file.file_size_bytes)}</span>
            <span>{new Date(file.uploaded_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex sm:hidden sm:group-hover:flex gap-1">
          {onEdit && <button onClick={() => onEdit(file)} className="p-1 text-[var(--pf-text-secondary)] hover:text-[var(--pf-text-primary)]"><Pencil size={14} /></button>}
          <a href={api.getFileDownloadUrl(file.id)} className="p-1 text-[var(--pf-text-secondary)] hover:text-[var(--pf-text-primary)]"><Download size={14} /></a>
          {onDelete && <button onClick={() => onDelete(file.id)} className="p-1 text-[var(--pf-text-secondary)] hover:text-[var(--pf-status-needs-work)]"><Trash2 size={14} /></button>}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: `${statusColor}20`, color: statusColor }}>
          {file.processing_status}
        </span>
        <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--pf-bg-hover)] text-[var(--pf-text-secondary)]">
          {file.file_type.replace(/_/g, ' ')}
        </span>
        {file.linked_type && (
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--pf-accent-teal)', color: 'white' }}>
            {file.linked_type}
          </span>
        )}
      </div>
    </div>
  );
}
