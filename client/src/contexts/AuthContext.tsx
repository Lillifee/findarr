import { isDefined, type User } from '@findarr/shared';
import axios from 'axios';
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authService } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch current user on mount
  useEffect(() => {
    void refreshUser();
  }, []);

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

  async function refreshUser() {
    try {
      const user = await authService.me();
      setUser(user);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const user = await authService.login({ email, password });
    setUser(user);
  }

  async function logout() {
    await authService.logout();
    setUser(null);
  }

  const value: AuthContextType = {
    user,
    isAuthenticated: isDefined(user),
    isAdmin: user?.role === 'admin',
    isLoading,
    login,
    logout,
    refreshUser,
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
