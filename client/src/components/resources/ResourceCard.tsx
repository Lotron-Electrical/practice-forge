import type { Resource } from '../../core/types';
import { Badge } from '../ui/Badge';
import { BookOpen, Play, Globe, Link as LinkIcon, X } from 'lucide-react';

const SOURCE_ICON: Record<string, typeof BookOpen> = {
  imslp: BookOpen,
  youtube: Play,
  wikipedia: Globe,
  manual: LinkIcon,
};

const SOURCE_LABEL: Record<string, string> = {
  imslp: 'IMSLP',
  youtube: 'YouTube',
  wikipedia: 'Wikipedia',
  manual: 'Manual',
};

interface ResourceCardProps {
  resource: Resource;
  onDelete: (id: string) => void;
}

export function ResourceCard({ resource, onDelete }: ResourceCardProps) {
  const Icon = SOURCE_ICON[resource.source] || LinkIcon;

  return (
    <div className="flex items-start gap-2 py-1.5 group">
      <Icon size={14} className="mt-0.5 shrink-0 text-[var(--pf-text-secondary)]" />
      <div className="flex-1 min-w-0">
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium hover:underline text-[var(--pf-text-primary)] block truncate"
          title={resource.title}
        >
          {resource.title}
        </a>
        {resource.description && (
          <p className="text-xs text-[var(--pf-text-secondary)] truncate">{resource.description}</p>
        )}
      </div>
      <Badge color="var(--pf-accent-teal)" className="shrink-0 text-[10px]">{SOURCE_LABEL[resource.source]}</Badge>
      <button
        onClick={() => onDelete(resource.id)}
        className="p-0.5 text-[var(--pf-text-secondary)] opacity-0 group-hover:opacity-100 hover:text-[var(--pf-status-needs-work)]"
      >
        <X size={12} />
      </button>
    </div>
  );
}
