import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api, setAuthToken, getAuthToken } from '../api/client';
import type { User, AuthResponse } from '../core/types';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; display_name?: string; instrument?: string; level?: string }) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from token on mount
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      api.getMe()
        .then(data => setUser(data as User))
        .catch(() => {
          // Token expired or invalid
          setAuthToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.login(email, password) as AuthResponse;
    setAuthToken(result.token);
    setUser(result.user);
  }, []);

  const register = useCallback(async (data: { email: string; password: string; display_name?: string; instrument?: string; level?: string }) => {
    const result = await api.register(data) as AuthResponse;
    setAuthToken(result.token);
    setUser(result.user);
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback(async (data: Partial<User>) => {
    const updated = await api.updateProfile(data) as User;
    setUser(updated);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      login, register, logout, updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
