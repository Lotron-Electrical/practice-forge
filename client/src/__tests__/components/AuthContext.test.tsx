import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// We need to unmock AuthContext for this test
vi.unmock('../../auth/AuthContext');

// Mock the api client directly
const mockLogin = vi.fn();
const mockRegister = vi.fn();
const mockGetMe = vi.fn();
const mockUpdateProfile = vi.fn();
const mockSetAuthToken = vi.fn();
const mockGetAuthToken = vi.fn(() => null);

vi.mock('../../api/client', () => ({
  api: {
    login: (...args: any[]) => mockLogin(...args),
    register: (...args: any[]) => mockRegister(...args),
    getMe: (...args: any[]) => mockGetMe(...args),
    updateProfile: (...args: any[]) => mockUpdateProfile(...args),
  },
  setAuthToken: (...args: any[]) => mockSetAuthToken(...args),
  getAuthToken: () => mockGetAuthToken(),
}));

// Import after mocks
import { AuthProvider, useAuth } from '../../auth/AuthContext';

function TestConsumer() {
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="user">{user?.display_name ?? 'none'}</span>
      <button onClick={() => login('a@b.com', 'pass')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthToken.mockReturnValue(null);
  });

  it('throws when useAuth is used outside AuthProvider', () => {
    // Suppress console.error for this expected error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useAuth must be used within AuthProvider');
    spy.mockRestore();
  });

  it('starts not authenticated when no token exists', async () => {
    render(
      <MemoryRouter>
        <AuthProvider><TestConsumer /></AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByTestId('user').textContent).toBe('none');
  });

  it('logs in and sets user', async () => {
    const user = userEvent.setup();
    const mockUser = { id: '1', display_name: 'Test', email: 'a@b.com' };
    mockLogin.mockResolvedValue({ token: 'tok', user: mockUser });

    render(
      <MemoryRouter>
        <AuthProvider><TestConsumer /></AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    await user.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
      expect(screen.getByTestId('user').textContent).toBe('Test');
    });
    expect(mockSetAuthToken).toHaveBeenCalledWith('tok');
  });

  it('logs out and clears user', async () => {
    const user = userEvent.setup();
    const mockUser = { id: '1', display_name: 'Test', email: 'a@b.com' };
    mockLogin.mockResolvedValue({ token: 'tok', user: mockUser });

    render(
      <MemoryRouter>
        <AuthProvider><TestConsumer /></AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    await user.click(screen.getByText('Login'));
    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
    });

    await user.click(screen.getByText('Logout'));
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(mockSetAuthToken).toHaveBeenCalledWith(null);
  });

  it('loads user from existing token on mount', async () => {
    mockGetAuthToken.mockReturnValue('existing-token');
    const mockUser = { id: '1', display_name: 'Existing', email: 'e@x.com' };
    mockGetMe.mockResolvedValue(mockUser);

    render(
      <MemoryRouter>
        <AuthProvider><TestConsumer /></AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('Existing');
    });
  });
});
