import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '../../test/helpers';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnalyticsPage } from '../../pages/AnalyticsPage';
import { api } from '../../api/client';

const mockApi = vi.mocked(api);

describe('AnalyticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.getAnalyticsTrends.mockResolvedValue(null);
    mockApi.getAnalyticsTimeByCategory.mockResolvedValue({});
    mockApi.getAnalyticsDrift.mockResolvedValue(null);
    mockApi.getAnalyticsStalledPieces.mockResolvedValue([]);
    mockApi.getSessionHistory.mockResolvedValue(null);
  });

  it('renders without crashing', () => {
    render(<AnalyticsPage />);
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('shows period toggle buttons', () => {
    render(<AnalyticsPage />);
    expect(screen.getByText('Week')).toBeInTheDocument();
    expect(screen.getByText('Month')).toBeInTheDocument();
  });

  it('shows Time Distribution section', () => {
    render(<AnalyticsPage />);
    // May match both CardHeader and mocked component — just verify at least one exists
    expect(screen.getAllByText('Time Distribution').length).toBeGreaterThanOrEqual(1);
  });

  it('shows Stalled Pieces section', () => {
    render(<AnalyticsPage />);
    expect(screen.getByText('Stalled Pieces')).toBeInTheDocument();
  });

  it('shows no stalled pieces message when empty', async () => {
    render(<AnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText('No stalled pieces detected.')).toBeInTheDocument();
    });
  });

  it('shows Period Summary when trends data available', async () => {
    mockApi.getAnalyticsTrends.mockResolvedValue({ totalMinutes: 120, sessions: 5 });
    render(<AnalyticsPage />);
    await waitFor(() => {
      expect(screen.getAllByText('Period Summary').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByTestId('period-summary')).toBeInTheDocument();
    });
  });

  it('shows Allocation Drift when drift data available', async () => {
    mockApi.getAnalyticsDrift.mockResolvedValue({ categories: [] });
    render(<AnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText('Allocation Drift')).toBeInTheDocument();
      expect(screen.getByTestId('drift-chart')).toBeInTheDocument();
    });
  });

  it('shows Session History when data available', async () => {
    mockApi.getSessionHistory.mockResolvedValue({ total: 10, sessions: [] });
    render(<AnalyticsPage />);
    await waitFor(() => {
      expect(screen.getAllByText('Session History').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows stalled pieces from API', async () => {
    mockApi.getAnalyticsStalledPieces.mockResolvedValue([
      { piece_id: '1', title: 'Stuck Piece', composer: 'Someone', total_minutes: 120, days_since_change: 14 },
    ] as any);
    render(<AnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText('Stuck Piece')).toBeInTheDocument();
    });
  });

  it('switches period on toggle click', async () => {
    const user = userEvent.setup();
    render(<AnalyticsPage />);
    await user.click(screen.getByText('Month'));
    // Should call API with month period
    expect(mockApi.getAnalyticsTrends).toHaveBeenCalledWith('month');
  });
});
