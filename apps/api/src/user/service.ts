import type { UserSettings, UserSettingsQuery } from '@findarr/shared/settings';

import { getUserById } from '../auth/repository.js';
import type { Database } from '../db/service.js';
import { createLruTtlCache } from '../utils/cacheHelper.js';
import {
  getOrCreateUserSettings,
  updateUserSettings as updateUserSettingsInRepository,
} from './repository.js';

export interface UserContextSettings extends UserSettings {
  isAdmin: boolean;
}

export interface UserServiceContext {
  db: Database;
}

/**
 * User service - resolves per-user settings.
 */
export function createUserService(context: UserServiceContext) {
  const { db } = context;
  const cache = createLruTtlCache<UserContextSettings>(30_000, 1000);

  /**
   * Get a user's settings + admin status, cached briefly per userId.
   * Use this instead of `getSettings` when the caller also needs `isAdmin`,
   * or when the same userId is looked up repeatedly within a short window.
   */
  async function getContextSettings(userId: number): Promise<UserContextSettings> {
    return cache.getOrLoad(String(userId), async () => {
      const [settings, user] = await Promise.all([
        getOrCreateUserSettings(db, userId),
        getUserById(db, userId),
      ]);

      return { ...settings, isAdmin: user?.role === 'admin' };
    });
  }

  async function getSettings(userId: number) {
    return getContextSettings(userId);
  }

  async function saveSettings(userId: number, updates: UserSettingsQuery): Promise<UserSettings> {
    const settings = await updateUserSettingsInRepository(db, userId, updates);
    // Invalidate so the next read reflects the change instead of serving stale cached settings.
    cache.remove(String(userId));
    return settings;
  }

  return { getSettings, saveSettings };
}

export type UserService = ReturnType<typeof createUserService>;
