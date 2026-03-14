import { describe, it, expect, vi } from 'vitest';
import { render } from '../../test/helpers';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock useExperienceLevel to return advanced so all nav items are visible
vi.mock('../../hooks/useExperienceLevel', () => ({
  useExperienceLevel: () => ({ level: 'advanced', isLoading: false, updateLevel: vi.fn() }),
  isNavItemAllowed: () => true,
  isPathAllowed: () => true,
}));

import { Sidebar } from '../../components/layout/Sidebar';

describe('Sidebar', () => {
  it('renders all navigation items on desktop', async () => {
    const user = userEvent.setup();
    render(<Sidebar isMobile={false} isOpen={false} onClose={vi.fn()} />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Pieces')).toBeInTheDocument();
    expect(screen.getByText('Exercises')).toBeInTheDocument();
    expect(screen.getByText('Session')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    // Settings and Community are inside the collapsible "More" section
    const moreBtn = screen.getByText('More');
    await user.click(moreBtn);
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Community')).toBeInTheDocument();
  });

  it('shows brand name on desktop', () => {
    render(<Sidebar isMobile={false} isOpen={false} onClose={vi.fn()} />);
    expect(screen.getByText('PRACTICE')).toBeInTheDocument();
    expect(screen.getByText('FORGE')).toBeInTheDocument();
  });

  it('toggles collapse on desktop', async () => {
    const user = userEvent.setup();
    render(<Sidebar isMobile={false} isOpen={false} onClose={vi.fn()} />);
    const collapseBtn = screen.getByLabelText('Collapse sidebar');
    await user.click(collapseBtn);
    // After collapse, PF abbreviation should show
    expect(screen.getByText('PF')).toBeInTheDocument();
    // Nav labels should be hidden (no "Dashboard" text)
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('renders mobile drawer when open', () => {
    render(<Sidebar isMobile={true} isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByLabelText('Close menu')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked on mobile', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Sidebar isMobile={true} isOpen={true} onClose={onClose} />);
    await user.click(screen.getByLabelText('Close menu'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders correct nav link hrefs', () => {
    // Use mobile drawer where More is always expanded (forceMoreOpen)
    render(<Sidebar isMobile={true} isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByTitle('Dashboard')).toHaveAttribute('href', '/');
    expect(screen.getByTitle('Pieces')).toHaveAttribute('href', '/pieces');
    expect(screen.getByTitle('Settings')).toHaveAttribute('href', '/settings');
  });
});
