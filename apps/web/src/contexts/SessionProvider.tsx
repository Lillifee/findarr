import type { User } from '@findarr/shared/auth';
import { isDefined } from '@findarr/shared/utils';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { api, authService } from '../services/api';
import { SessionContext, type SessionContextType } from './SessionContext';

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTmdbConfigured, setIsTmdbConfigured] = useState(false);

  const refreshBootstrapStatus = useCallback(async () => {
    const bootstrap = await authService.bootstrap();
    setIsTmdbConfigured(bootstrap.tmdbConfigured);
  }, []);

  const refreshUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const [currentUser, bootstrap] = await Promise.all([
        authService.me(),
        authService.bootstrap(),
      ]);
      setUser(currentUser);
      setIsTmdbConfigured(bootstrap.tmdbConfigured);
    } catch {
      setUser(null);
      setIsTmdbConfigured(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch current user on mount
  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  // Add axios interceptor to handle 401 errors
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
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
      api.interceptors.response.eject(interceptor);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const currentUser = await authService.login({ email, password });
    const bootstrap = await authService.bootstrap();
    setUser(currentUser);
    setIsTmdbConfigured(bootstrap.tmdbConfigured);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setIsTmdbConfigured(false);
  }, []);

  const value = useMemo<SessionContextType>(
    () => ({
      user,
      isAuthenticated: isDefined(user),
      isAdmin: user?.role === 'admin',
      isLoading,
      isTmdbConfigured,
      login,
      logout,
      refreshUser,
      refreshBootstrapStatus,
    }),
    [user, isLoading, isTmdbConfigured, login, logout, refreshUser, refreshBootstrapStatus],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
