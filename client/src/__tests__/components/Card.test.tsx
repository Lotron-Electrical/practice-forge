import { describe, it, expect } from 'vitest';
import { render } from '../../test/helpers';
import { screen } from '@testing-library/react';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies border color when provided', () => {
    const { container } = render(<Card borderColor="red">Bordered</Card>);
    const card = container.firstElementChild as HTMLElement;
    expect(card.style.borderLeftWidth).toBe('4px');
    expect(card.style.borderLeftColor).toBe('red');
  });

  it('does not apply border style without borderColor', () => {
    const { container } = render(<Card>No border</Card>);
    const card = container.firstElementChild as HTMLElement;
    expect(card.style.borderLeftWidth).toBe('');
  });

  it('merges custom className', () => {
    const { container } = render(<Card className="extra-class">Custom</Card>);
    expect(container.firstElementChild).toHaveClass('extra-class');
  });
});

describe('CardHeader', () => {
  it('renders children', () => {
    render(<CardHeader>Header</CardHeader>);
    expect(screen.getByText('Header')).toBeInTheDocument();
  });
});

describe('CardContent', () => {
  it('renders children', () => {
    render(<CardContent>Content</CardContent>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});

describe('Card composition', () => {
  it('renders header and content together', () => {
    render(
      <Card>
        <CardHeader>My Header</CardHeader>
        <CardContent>My Content</CardContent>
      </Card>
    );
    expect(screen.getByText('My Header')).toBeInTheDocument();
    expect(screen.getByText('My Content')).toBeInTheDocument();
  });
});
