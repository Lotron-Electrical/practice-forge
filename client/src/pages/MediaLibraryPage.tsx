import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Textarea, Select } from '../components/ui/Input';
import { FileUploadZone } from '../components/ui/FileUploadZone';
import { FileCard } from '../components/ui/FileCard';
import { api } from '../api/client';
import type { UploadedFile, FileType, ProcessingStatus, LinkedType } from '../core/types';
import { FolderOpen, Search, X, ChevronDown, ChevronUp } from 'lucide-react';

export function MediaLibraryPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showUpload, setShowUpload] = useState(true);
  const [editingFile, setEditingFile] = useState<UploadedFile | null>(null);
  const [editForm, setEditForm] = useState({ notes: '', tags: '', file_type: '' as string, linked_type: '' as string, linked_id: '' });
  const [uploading, setUploading] = useState(false);

  const load = useCallback(() => {
    const params: Record<string, string> = {};
    if (filterType) params.file_type = filterType;
    if (filterStatus) params.processing_status = filterStatus;
    if (search) params.search = search;
    api.getFiles(params).then(d => setFiles(d as UploadedFile[])).catch(() => {});
  }, [filterType, filterStatus, search]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (selectedFiles: File[]) => {
    setUploading(true);
    for (const file of selectedFiles) {
      try { await api.uploadFile(file); } catch {}
    }
    setUploading(false);
    load();
  };

  const openEdit = (file: UploadedFile) => {
    setEditingFile(file);
    const tags = Array.isArray(file.tags) ? file.tags : (typeof file.tags === 'string' ? JSON.parse(file.tags || '[]') : []);
    setEditForm({
      notes: file.notes || '',
      tags: tags.join(', '),
      file_type: file.file_type,
      linked_type: file.linked_type || '',
      linked_id: file.linked_id || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingFile) return;
    await api.updateFile(editingFile.id, {
      notes: editForm.notes,
      tags: editForm.tags ? editForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      file_type: editForm.file_type,
      linked_type: editForm.linked_type || null,
      linked_id: editForm.linked_id || null,
    });
    setEditingFile(null);
    load();
  };

  const handleDelete = async (id: string) => {
    await api.deleteFile(id);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Media Library</h1>
        <Button variant="secondary" size="sm" onClick={() => setShowUpload(!showUpload)}>
          {showUpload ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {showUpload ? 'Hide Upload' : 'Show Upload'}
        </Button>
      </div>

      {/* Upload zone */}
      {showUpload && (
        <div className="mb-6">
          <FileUploadZone onFilesSelected={handleUpload} />
          {uploading && <p className="text-sm text-[var(--pf-text-secondary)] mt-2">Uploading...</p>}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mb-6">
        <div className="relative w-full sm:w-auto sm:flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--pf-text-secondary)]" />
          <input
            type="text"
            placeholder="Search files..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-pf-sm border border-[var(--pf-border-color)] bg-[var(--pf-bg-input)] text-[var(--pf-text-primary)]"
          />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 rounded-pf-sm border border-[var(--pf-border-color)] bg-[var(--pf-bg-input)] text-sm">
          <option value="">All types</option>
          <option value="sheet_music_digital">Sheet Music (Digital)</option>
          <option value="sheet_music_scanned">Sheet Music (Scanned)</option>
          <option value="audio">Audio</option>
          <option value="video">Video</option>
          <option value="document">Document</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-pf-sm border border-[var(--pf-border-color)] bg-[var(--pf-bg-input)] text-sm">
          <option value="">All statuses</option>
          <option value="complete">Complete</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="failed">Failed</option>
          <option value="needs_review">Needs Review</option>
        </select>
      </div>

      {/* Edit form */}
      {editingFile && (
        <Card className="mb-6">
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Edit: {editingFile.original_filename}</h2>
              <button onClick={() => setEditingFile(null)} className="text-[var(--pf-text-secondary)]"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select label="File Type" value={editForm.file_type} onChange={e => setEditForm(f => ({ ...f, file_type: e.target.value }))}>
                <option value="sheet_music_digital">Sheet Music (Digital)</option>
                <option value="sheet_music_scanned">Sheet Music (Scanned)</option>
                <option value="audio">Audio</option>
                <option value="video">Video</option>
                <option value="document">Document</option>
              </Select>
              <Select label="Linked Type" value={editForm.linked_type} onChange={e => setEditForm(f => ({ ...f, linked_type: e.target.value }))}>
                <option value="">None</option>
                <option value="piece">Piece</option>
                <option value="section">Section</option>
                <option value="excerpt">Excerpt</option>
                <option value="exercise">Exercise</option>
                <option value="freeform">Freeform</option>
              </Select>
              {editForm.linked_type && (
                <Input label="Linked ID" value={editForm.linked_id} onChange={e => setEditForm(f => ({ ...f, linked_id: e.target.value }))} placeholder="Entity UUID" />
              )}
              <Input label="Tags (comma-separated)" value={editForm.tags} onChange={e => setEditForm(f => ({ ...f, tags: e.target.value }))} />
            </div>
            <Textarea label="Notes" value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={() => setEditingFile(null)}>Cancel</Button>
              <Button size="sm" onClick={handleSaveEdit}>Save</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* File grid */}
      {files.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FolderOpen size={48} className="mx-auto mb-4 text-[var(--pf-text-secondary)]" />
            <p className="text-[var(--pf-text-secondary)]">No files uploaded yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {files.map(file => (
            <FileCard key={file.id} file={file} onEdit={openEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
