import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement, ReactNode } from 'react';

// Auth mock context provider
import { vi } from 'vitest';

const defaultUser = {
  id: 'user-1',
  email: 'test@example.com',
  display_name: 'Test User',
  instrument: 'flute',
  level: 'advanced_student' as const,
  institution: null,
  bio: null,
  avatar_url: null,
  privacy_settings: {
    profile_visible: true,
    stats_visible: true,
    recordings_shareable: true,
    activity_visible: true,
  },
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

const mockAuthValue = {
  user: defaultUser,
  isLoading: false,
  isAuthenticated: true,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  updateUser: vi.fn(),
};

// We mock AuthContext at the module level in setup.ts, but for pages that
// call useAuth directly, we provide the mock via the module mock.
vi.mock('../auth/AuthContext', () => ({
  useAuth: () => mockAuthValue,
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

function AllProviders({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      {children}
    </MemoryRouter>
  );
}

function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export { customRender as render, defaultUser, mockAuthValue };
