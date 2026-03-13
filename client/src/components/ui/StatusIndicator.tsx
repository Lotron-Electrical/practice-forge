// Status must always be colour + icon + label (spec rule 5.6)

interface StatusIndicatorProps {
  icon: string;
  label: string;
  colorVar: string;
  size?: 'sm' | 'md';
}

export function StatusIndicator({ icon, label, colorVar, size = 'md' }: StatusIndicatorProps) {
  const sizeClass = size === 'sm' ? 'text-xs' : 'text-sm';
  return (
    <span className={`inline-flex items-center gap-1.5 ${sizeClass}`}>
      <span
        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold"
        style={{ color: `var(${colorVar})`, backgroundColor: `var(${colorVar})20` }}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span style={{ color: `var(${colorVar})` }} className="font-medium">{label}</span>
    </span>
  );
}
