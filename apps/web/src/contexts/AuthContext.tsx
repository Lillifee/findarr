import type { User } from '@findarr/shared';
import { createContext } from 'react';

export interface AuthContextType {
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

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
