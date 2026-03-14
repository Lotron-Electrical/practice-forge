import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '../../test/helpers';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommunityPage } from '../../pages/CommunityPage';
import { api } from '../../api/client';

const mockApi = vi.mocked(api);

describe('CommunityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.getFeed.mockResolvedValue([]);
    mockApi.getChallenges.mockResolvedValue([]);
    mockApi.getFollowing.mockResolvedValue([]);
    mockApi.searchUsers.mockResolvedValue([]);
  });

  it('renders without crashing', () => {
    render(<CommunityPage />);
    expect(screen.getByText('Community')).toBeInTheDocument();
  });

  it('shows all tab buttons', () => {
    render(<CommunityPage />);
    expect(screen.getByText('Feed')).toBeInTheDocument();
    expect(screen.getByText('Challenges')).toBeInTheDocument();
    expect(screen.getByText('People')).toBeInTheDocument();
    expect(screen.getByText('Themes')).toBeInTheDocument();
  });

  it('shows empty feed message', async () => {
    render(<CommunityPage />);
    await waitFor(() => {
      expect(screen.getByText(/Follow other musicians/)).toBeInTheDocument();
    });
  });

  it('shows Find People button on empty feed', async () => {
    render(<CommunityPage />);
    await waitFor(() => {
      expect(screen.getByText('Find People')).toBeInTheDocument();
    });
  });

  it('shows feed events when available', async () => {
    mockApi.getFeed.mockResolvedValue([
      { id: '1', user_id: 'u1', event_type: 'session_completed', title: 'Completed a session', description: '60 min session', data: {}, display_name: 'Alice', instrument: 'violin', created_at: new Date().toISOString() },
    ] as any);
    render(<CommunityPage />);
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Completed a session')).toBeInTheDocument();
    });
  });

  it('switches to challenges tab', async () => {
    const user = userEvent.setup();
    render(<CommunityPage />);
    await user.click(screen.getByText('Challenges'));
    await waitFor(() => {
      expect(screen.getByText('Create Challenge')).toBeInTheDocument();
    });
  });

  it('shows empty challenges message', async () => {
    const user = userEvent.setup();
    render(<CommunityPage />);
    await user.click(screen.getByText('Challenges'));
    await waitFor(() => {
      expect(screen.getByText(/No challenges yet/)).toBeInTheDocument();
    });
  });

  it('switches to people tab and shows search', async () => {
    const user = userEvent.setup();
    render(<CommunityPage />);
    await user.click(screen.getByText('People'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search musicians...')).toBeInTheDocument();
    });
  });

  it('shows following section on people tab', async () => {
    const user = userEvent.setup();
    render(<CommunityPage />);
    await user.click(screen.getByText('People'));
    await waitFor(() => {
      expect(screen.getByText(/Following/)).toBeInTheDocument();
    });
  });

  it('shows not following anyone message', async () => {
    const user = userEvent.setup();
    render(<CommunityPage />);
    await user.click(screen.getByText('People'));
    await waitFor(() => {
      expect(screen.getByText('You are not following anyone yet.')).toBeInTheDocument();
    });
  });

  it('switches to themes tab', async () => {
    const user = userEvent.setup();
    render(<CommunityPage />);
    await user.click(screen.getByText('Themes'));
    await waitFor(() => {
      expect(screen.getByTestId('theme-gallery')).toBeInTheDocument();
    });
  });
});
