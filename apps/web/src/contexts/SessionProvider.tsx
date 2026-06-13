import type { User } from '@findarr/shared/auth';
import { isDefined } from '@findarr/shared/utils';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { api, authService } from '../services/api';
import { SessionContext, type SessionContextType } from './SessionContext';

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTmdbConfigured, setIsTmdbConfigured] = useState(false);
  const [requiresOwnerSetup, setRequiresOwnerSetup] = useState(false);

  const refreshBootstrapStatus = useCallback(async () => {
    const bootstrap = await authService.bootstrap();
    setIsTmdbConfigured(bootstrap.tmdbConfigured);
    setRequiresOwnerSetup(bootstrap.requiresOwnerSetup);
  }, []);

  const refreshUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const bootstrap = await authService.bootstrap();
      setIsTmdbConfigured(bootstrap.tmdbConfigured);
      setRequiresOwnerSetup(bootstrap.requiresOwnerSetup);

      if (bootstrap.requiresOwnerSetup) {
        setUser(null);
        return;
      }

      const currentUser = await authService.me();
      setUser(currentUser);
    } catch {
      setUser(null);
      setIsTmdbConfigured(false);
      setRequiresOwnerSetup(false);
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
    setRequiresOwnerSetup(bootstrap.requiresOwnerSetup);
  }, []);

  const setupOwner = useCallback(async (email: string, password: string, displayName: string) => {
    const currentUser = await authService.setupOwner({ email, password, displayName });
    const bootstrap = await authService.bootstrap();
    setUser(currentUser);
    setIsTmdbConfigured(bootstrap.tmdbConfigured);
    setRequiresOwnerSetup(bootstrap.requiresOwnerSetup);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setIsTmdbConfigured(false);
    await refreshBootstrapStatus();
  }, [refreshBootstrapStatus]);

  const value = useMemo<SessionContextType>(
    () => ({
      user,
      isAuthenticated: isDefined(user),
      isAdmin: user?.role === 'admin',
      isLoading,
      isTmdbConfigured,
      requiresOwnerSetup,
      login,
      setupOwner,
      logout,
      refreshUser,
      refreshBootstrapStatus,
    }),
    [
      user,
      isLoading,
      isTmdbConfigured,
      requiresOwnerSetup,
      login,
      setupOwner,
      logout,
      refreshUser,
      refreshBootstrapStatus,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
