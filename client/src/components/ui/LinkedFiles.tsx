import { useEffect, useState, useCallback } from 'react';
import { api } from '../../api/client';
import { FileUploadZone } from './FileUploadZone';
import type { UploadedFile, LinkedType } from '../../core/types';
import { Download, X, Paperclip } from 'lucide-react';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface LinkedFilesProps {
  linkedType: LinkedType;
  linkedId: string;
}

export function LinkedFiles({ linkedType, linkedId }: LinkedFilesProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [showUpload, setShowUpload] = useState(false);

  const load = useCallback(() => {
    api.getFiles({ linked_type: linkedType, linked_id: linkedId })
      .then(d => setFiles(d as UploadedFile[]))
      .catch(() => {});
  }, [linkedType, linkedId]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (selectedFiles: File[]) => {
    for (const file of selectedFiles) {
      try { await api.uploadFile(file, { linked_type: linkedType, linked_id: linkedId }); } catch {}
    }
    setShowUpload(false);
    load();
  };

  const handleUnlink = async (fileId: string) => {
    await api.unlinkFile(fileId);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-[var(--pf-text-secondary)]">Attached Files</h3>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="flex items-center gap-1 text-xs text-[var(--pf-accent-teal)] hover:underline"
        >
          <Paperclip size={12} /> Attach File
        </button>
      </div>

      {showUpload && (
        <div className="mb-3">
          <FileUploadZone onFilesSelected={handleUpload} className="py-4" />
        </div>
      )}

      {files.length === 0 && !showUpload && (
        <p className="text-xs text-[var(--pf-text-secondary)]">No files attached.</p>
      )}

      <div className="space-y-1">
        {files.map(f => (
          <div key={f.id} className="flex items-center gap-2 py-1 group">
            <a
              href={api.getFileDownloadUrl(f.id)}
              className="flex-1 text-xs truncate hover:underline text-[var(--pf-text-primary)]"
              title={f.original_filename}
            >
              {f.original_filename}
            </a>
            <span className="text-xs text-[var(--pf-text-secondary)] shrink-0">{formatSize(f.file_size_bytes)}</span>
            <a href={api.getFileDownloadUrl(f.id)} className="p-0.5 text-[var(--pf-text-secondary)] hover:text-[var(--pf-text-primary)]"><Download size={12} /></a>
            <button onClick={() => handleUnlink(f.id)} className="p-2 sm:p-0.5 text-[var(--pf-text-secondary)] sm:opacity-0 sm:group-hover:opacity-100 hover:text-[var(--pf-status-needs-work)]"><X size={12} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
