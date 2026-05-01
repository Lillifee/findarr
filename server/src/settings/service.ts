import type { UserSettings, UserSettingsQuery } from '@findarr/shared';
import type { DB } from '../db/setup.js';
import {
  getOrCreateUserSettings,
  updateUserSettings as updateUserSettingsInRepository,
} from './repository.js';

export async function getUserSettings(db: DB, userId: number) {
  return getOrCreateUserSettings(db, userId);
}

export async function saveUserSettings(
  db: DB,
  userId: number,
  updates: UserSettingsQuery
): Promise<UserSettings> {
  return updateUserSettingsInRepository(db, userId, updates);
}
