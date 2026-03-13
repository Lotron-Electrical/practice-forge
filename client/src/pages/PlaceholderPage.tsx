import { Card, CardContent } from '../components/ui/Card';

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export function PlaceholderPage({ title, description, icon }: PlaceholderPageProps) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{title}</h1>
      <Card>
        <CardContent className="text-center py-16">
          <div className="mb-4 text-[var(--pf-text-secondary)] flex justify-center">{icon}</div>
          <p className="text-[var(--pf-text-secondary)]">{description}</p>
          <p className="text-xs text-[var(--pf-text-secondary)] mt-2">Coming in a future phase.</p>
        </CardContent>
      </Card>
    </div>
  );
}
