interface DifficultyDotsProps {
  value: number | null;
  max?: number;
}

export function DifficultyDots({ value, max = 10 }: DifficultyDotsProps) {
  if (value == null)
    return <span className="text-[var(--pf-text-secondary)] text-sm">—</span>;
  return (
    <span
      className="inline-flex gap-0.5"
      aria-label={`Difficulty ${value} out of ${max}`}
    >
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor:
              i < value ? "var(--pf-accent-gold)" : "var(--pf-border-color)",
          }}
        />
      ))}
    </span>
  );
}
