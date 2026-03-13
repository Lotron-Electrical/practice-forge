import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  className?: string;
}

export function FileUploadZone({ onFilesSelected, accept, multiple = true, className = '' }: FileUploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFilesSelected(files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) onFilesSelected(files);
    e.target.value = '';
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed rounded-pf cursor-pointer transition-colors ${
        dragOver
          ? 'border-[var(--pf-accent-teal)] bg-[var(--pf-accent-teal)]/10'
          : 'border-[var(--pf-border-color)] hover:border-[var(--pf-text-secondary)]'
      } ${className}`}
    >
      <Upload size={24} className="text-[var(--pf-text-secondary)]" />
      <p className="text-sm text-[var(--pf-text-secondary)]">Drop files here or click to browse</p>
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
