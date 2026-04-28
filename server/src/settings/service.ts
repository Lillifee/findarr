import type { UserSettings, UserSettingsBody } from '@findarr/shared';
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
  updates: UserSettingsBody
): Promise<UserSettings> {
  return updateUserSettingsInRepository(db, userId, updates);
}
