import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const CATEGORY_COLORS: Record<string, string> = {
  warmup: '#D4A843',
  fundamentals: '#4DB6AC',
  technique: '#4DB6AC',
  repertoire: '#5C9CE6',
  excerpts: '#9C8FD0',
  buffer: '#8A8A9A',
};

const CATEGORY_LABELS: Record<string, string> = {
  warmup: 'Warm-up',
  fundamentals: 'Fundamentals',
  technique: 'Technique',
  repertoire: 'Repertoire',
  excerpts: 'Excerpts',
  buffer: 'Buffer',
};

interface WeekData {
  week: string;
  [category: string]: string | number;
}

export function TimeDistributionChart({ data }: { data: WeekData[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-[var(--pf-text-secondary)] text-center py-8">No session data yet. Complete some sessions to see trends.</p>;
  }

  const categories = Object.keys(CATEGORY_COLORS);
  const formatted = data.map(d => ({
    ...d,
    label: new Date(d.week + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={formatted} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--pf-text-secondary)" />
        <YAxis tick={{ fontSize: 11 }} stroke="var(--pf-text-secondary)" unit="m" />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--pf-bg-secondary)',
            border: '1px solid var(--pf-border-color)',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          formatter={(value: any, name: any) => [`${value}m`, CATEGORY_LABELS[name] || name]}
          labelFormatter={(label: any) => `Week of ${label}`}
        />
        {categories.map(cat => (
          <Area
            key={cat}
            type="monotone"
            dataKey={cat}
            stackId="1"
            stroke={CATEGORY_COLORS[cat]}
            fill={CATEGORY_COLORS[cat]}
            fillOpacity={0.6}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
