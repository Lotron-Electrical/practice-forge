import { Button } from "../ui/Button";

interface PatternTooltipProps {
  type: string;
  label: string;
  barRange: string;
  difficulty?: number;
  confidence?: number;
  onImport?: () => void;
  onClose: () => void;
}

export function PatternTooltip({
  type,
  label,
  barRange,
  difficulty,
  confidence,
  onImport,
  onClose,
}: PatternTooltipProps) {
  return (
    <div className="absolute z-20 bg-[var(--pf-bg-card)] border border-[var(--pf-border-color)] rounded-pf shadow-pf-lg p-3 min-w-[200px]">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium px-2 py-0.5 rounded bg-[var(--pf-bg-hover)] text-[var(--pf-text-secondary)]">
          {type}
        </span>
        <button
          onClick={onClose}
          className="text-[var(--pf-text-secondary)] hover:text-[var(--pf-text-primary)] text-xs"
        >
          x
        </button>
      </div>
      <p className="text-sm font-medium text-[var(--pf-text-primary)] mb-1">
        {label}
      </p>
      <p className="text-xs text-[var(--pf-text-secondary)]">Bars {barRange}</p>
      {difficulty && (
        <p className="text-xs text-[var(--pf-text-secondary)]">
          Difficulty: {difficulty}/10
        </p>
      )}
      {confidence && (
        <p className="text-xs text-[var(--pf-text-secondary)]">
          Confidence: {Math.round(confidence * 100)}%
        </p>
      )}
      {onImport && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onImport}
          className="mt-2 w-full text-xs"
        >
          Import as demand
        </Button>
      )}
    </div>
  );
}
