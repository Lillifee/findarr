import { type User, isDefined } from '@findarr/shared';
import axios from 'axios';
import { type ReactNode, useState, useCallback, useEffect, useMemo } from 'react';

import { authService } from '../services/api';
import { AuthContext, type AuthContextType } from './AuthContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tmdbConfigured, setTmdbConfigured] = useState(false);

  const applyBootstrapStatus = useCallback(
    (bootstrap: Awaited<ReturnType<typeof authService.bootstrap>>) => {
      setTmdbConfigured(bootstrap.tmdbConfigured);
    },
    [],
  );

  const refreshUser = useCallback(async () => {
    setIsLoading(true);
    try {
      setUser(await authService.me());
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
      (response) => response,
      (error: Error) => {
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        const axiosError = error as { response?: { status: number } };
        if (axiosError.response?.status === 401) {
          // Clear user on 401
          setUser(null);
        }
        throw error;
      },
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  const refreshBootstrapStatus = useCallback(async () => {
    if (!user) {
      setTmdbConfigured(false);
      return;
    }

    applyBootstrapStatus(await authService.bootstrap());
  }, [user, applyBootstrapStatus]);

  const login = useCallback(
    async (email: string, password: string) => {
      setUser(await authService.login({ email, password }));
      applyBootstrapStatus(await authService.bootstrap());
    },
    [applyBootstrapStatus],
  );

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setTmdbConfigured(false);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated: isDefined(user),
      isAdmin: user?.role === 'admin',
      isLoading,
      tmdbConfigured,
      login,
      logout,
      refreshUser,
      refreshBootstrapStatus,
    }),
    [user, isLoading, tmdbConfigured, login, logout, refreshUser, refreshBootstrapStatus],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
