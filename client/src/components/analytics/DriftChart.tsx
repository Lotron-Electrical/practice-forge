const CATEGORY_LABELS: Record<string, string> = {
  warmup: "Warm-up",
  fundamentals: "Fundamentals",
  technique: "Technique",
  repertoire: "Repertoire",
  excerpts: "Excerpts",
  buffer: "Buffer",
};

interface DriftData {
  target: Record<string, number>;
  actual: Record<string, number>;
  drift: Record<string, number>;
  alerts: string[];
  hasData: boolean;
}

export function DriftChart({ data }: { data: DriftData }) {
  if (!data.hasData) {
    return (
      <p className="text-sm text-[var(--pf-text-secondary)] text-center py-8">
        Complete sessions in the last 2 weeks to see allocation drift.
      </p>
    );
  }

  const categories = [
    "warmup",
    "fundamentals",
    "technique",
    "repertoire",
    "excerpts",
    "buffer",
  ];

  return (
    <div className="space-y-3">
      {categories.map((cat) => {
        const target = data.target[cat] || 0;
        const actual = data.actual[cat] || 0;
        const driftVal = data.drift[cat] || 0;
        const overDrift = Math.abs(driftVal) > 10;

        return (
          <div key={cat}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium">{CATEGORY_LABELS[cat]}</span>
              <span
                className={
                  overDrift
                    ? "text-[var(--pf-status-needs-work)] font-medium"
                    : "text-[var(--pf-text-secondary)]"
                }
              >
                {actual}% / {target}% target
                {driftVal !== 0 && ` (${driftVal > 0 ? "+" : ""}${driftVal}%)`}
              </span>
            </div>
            <div className="relative h-4 rounded-full overflow-hidden bg-[var(--pf-bg-hover)]">
              {/* Target marker */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-[var(--pf-text-secondary)] z-10"
                style={{ left: `${Math.min(target, 100)}%` }}
              />
              {/* Actual bar */}
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(actual, 100)}%`,
                  backgroundColor: overDrift
                    ? "var(--pf-status-needs-work)"
                    : "var(--pf-accent-gold)",
                }}
              />
            </div>
          </div>
        );
      })}

      {data.alerts.length > 0 && (
        <div className="mt-4 pt-3 border-t border-[var(--pf-border-color)] space-y-1.5">
          {data.alerts.map((alert, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <div
                className="w-1 h-4 rounded-full flex-shrink-0 mt-0.5"
                style={{ backgroundColor: "var(--pf-status-needs-work)" }}
              />
              <span>{alert}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
