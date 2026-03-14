import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '../../test/helpers';
import { screen, waitFor } from '@testing-library/react';
import { DashboardPage } from '../../pages/DashboardPage';
import { api } from '../../api/client';

const mockApi = vi.mocked(api);

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.getPieces.mockResolvedValue([]);
    mockApi.getSessionStats.mockResolvedValue({ weekHours: 0, weekSessions: 0, streak: 0 });
    mockApi.getTodayRotation.mockResolvedValue([]);
    mockApi.getExcerpts.mockResolvedValue([]);
    mockApi.getAnalyticsDrift.mockResolvedValue({});
    mockApi.getSettings.mockResolvedValue({});
  });

  it('renders without crashing', async () => {
    render(<DashboardPage />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('displays today date', () => {
    render(<DashboardPage />);
    // The date should contain the current year
    const year = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument();
  });

  it('shows welcome onboarding when no data', async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Welcome to Practice Forge')).toBeInTheDocument();
    });
  });

  it('shows onboarding steps', async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('1. Add a piece')).toBeInTheDocument();
      expect(screen.getByText('2. Upload music')).toBeInTheDocument();
      expect(screen.getByText('3. Start practising')).toBeInTheDocument();
    });
  });

  it('shows Today Session card with Start Session button', async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText("Today's Session")).toBeInTheDocument();
      expect(screen.getByText('Start Session')).toBeInTheDocument();
    });
  });

  it('displays stats from API', async () => {
    mockApi.getSessionStats.mockResolvedValue({ weekHours: 5, weekSessions: 3, streak: 7 });
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();
    });
  });

  it('shows View Analytics link', async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('View Analytics')).toBeInTheDocument();
    });
  });

  it('displays active pieces when available', async () => {
    mockApi.getPieces.mockResolvedValue([
      {
        id: '1', title: 'Mozart Concerto', composer: 'Mozart', status: 'in_progress',
        priority: 'high', difficulty: 7, target_date: null, sections: [], technical_demands: [],
        colour_tag: null, general_notes: '', historical_context: null, created_at: '', updated_at: '',
      },
    ] as any);
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Mozart Concerto')).toBeInTheDocument();
      expect(screen.getByText('Mozart')).toBeInTheDocument();
    });
  });

  it('shows empty state for pieces', async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/No active pieces/)).toBeInTheDocument();
    });
  });

  it('shows empty state for excerpts', async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/No excerpts yet/)).toBeInTheDocument();
    });
  });
});
