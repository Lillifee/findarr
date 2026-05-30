import type { UserSettings, UserSettingsQuery } from '@findarr/shared';

import type { Database } from '../db/service.js';
import {
  getOrCreateUserSettings,
  updateUserSettings as updateUserSettingsInRepository,
} from './repository.js';

export function getUserSettings(db: Database, userId: number) {
  return getOrCreateUserSettings(db, userId);
}

export function saveUserSettings(
  db: Database,
  userId: number,
  updates: UserSettingsQuery,
): Promise<UserSettings> {
  return updateUserSettingsInRepository(db, userId, updates);
}
