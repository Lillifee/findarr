import type { User } from '@findarr/shared/auth';
import { createContext } from 'react';

export interface SessionContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  isTmdbConfigured: boolean;
  requiresOwnerSetup: boolean;
  login: (email: string, password: string) => Promise<void>;
  setupOwner: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshBootstrapStatus: () => Promise<void>;
}

export const SessionContext = createContext<SessionContextType | undefined>(undefined);
