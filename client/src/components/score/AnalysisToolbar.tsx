import type { HighlightMode } from "../../core/types";
import { Waves, Triangle, BarChart3, Volume2, X } from "lucide-react";

interface AnalysisToolbarProps {
  mode: HighlightMode;
  onChange: (mode: HighlightMode) => void;
  counts?: { scales: number; arpeggios: number; dynamics: number };
}

const MODES: Array<{
  key: HighlightMode;
  label: string;
  icon: typeof Waves;
  color: string;
}> = [
  { key: "scales", label: "Scales", icon: Waves, color: "#3b82f6" },
  { key: "arpeggios", label: "Arpeggios", icon: Triangle, color: "#22c55e" },
  { key: "difficulty", label: "Difficulty", icon: BarChart3, color: "#ef4444" },
  { key: "dynamics", label: "Dynamics", icon: Volume2, color: "#a855f7" },
];

export function AnalysisToolbar({
  mode,
  onChange,
  counts,
}: AnalysisToolbarProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-medium text-[var(--pf-text-secondary)] mr-1">
        Highlight:
      </span>
      {MODES.map((m) => {
        const Icon = m.icon;
        const active = mode === m.key;
        const count = counts?.[m.key as keyof typeof counts];
        return (
          <button
            key={m.key}
            onClick={() => onChange(active ? "none" : m.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-pf-sm text-xs font-medium transition-colors border ${
              active
                ? "border-current bg-[var(--pf-bg-hover)]"
                : "border-[var(--pf-border-color)] hover:bg-[var(--pf-bg-hover)]"
            }`}
            style={
              active
                ? { color: m.color }
                : { color: "var(--pf-text-secondary)" }
            }
          >
            <Icon size={14} />
            {m.label}
            {count !== undefined && (
              <span className="opacity-60">({count})</span>
            )}
          </button>
        );
      })}
      {mode !== "none" && (
        <button
          onClick={() => onChange("none")}
          className="p-1 text-[var(--pf-text-secondary)] hover:text-[var(--pf-text-primary)]"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
