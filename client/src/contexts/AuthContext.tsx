import { isDefined, type User } from '@findarr/shared';
import axios from 'axios';
import { createContext, useCallback, useContext, useState, useEffect, type ReactNode } from 'react';
import { authService } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  tmdbConfigured: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshBootstrapStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tmdbConfigured, setTmdbConfigured] = useState(false);

  const applyBootstrapStatus = useCallback(
    (bootstrap: Awaited<ReturnType<typeof authService.bootstrap>>) => {
      setTmdbConfigured(bootstrap.tmdbConfigured);
    },
    []
  );

  const refreshUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const user = await authService.me();
      setUser(user);
      applyBootstrapStatus(await authService.bootstrap());
    } catch {
      setUser(null);
      setTmdbConfigured(false);
    } finally {
      setIsLoading(false);
    }
  }, [applyBootstrapStatus]);

  // Fetch current user on mount
  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  // Add axios interceptor to handle 401 errors
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 401) {
          // Clear user on 401
          setUser(null);
        }
        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  async function refreshBootstrapStatus() {
    if (!user) {
      setTmdbConfigured(false);
      return;
    }

    applyBootstrapStatus(await authService.bootstrap());
  }

  async function login(email: string, password: string) {
    const user = await authService.login({ email, password });
    setUser(user);
    applyBootstrapStatus(await authService.bootstrap());
  }

  async function logout() {
    await authService.logout();
    setUser(null);
    setTmdbConfigured(false);
  }

  const value: AuthContextType = {
    user,
    isAuthenticated: isDefined(user),
    isAdmin: user?.role === 'admin',
    isLoading,
    tmdbConfigured,
    login,
    logout,
    refreshUser,
    refreshBootstrapStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
