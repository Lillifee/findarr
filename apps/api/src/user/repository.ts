import { userSettings } from '@findarr/shared/db';
import {
  DEFAULT_USER_SETTINGS,
  type UserSettings,
  type UserSettingsQuery,
} from '@findarr/shared/settings';
import { eq, sql } from 'drizzle-orm';

import type { Database } from '../db/service.js';

export async function getOrCreateUserSettings(db: Database, userId: number): Promise<UserSettings> {
  const existing = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
  });

  if (existing) {
    return existing;
  }

  await db.insert(userSettings).values({
    userId,
    language: DEFAULT_USER_SETTINGS.language,
    uiLanguage: DEFAULT_USER_SETTINGS.uiLanguage,
    regions: DEFAULT_USER_SETTINGS.regions,
    swipeLimit: DEFAULT_USER_SETTINGS.swipeLimit,
  });

  return DEFAULT_USER_SETTINGS;
}

export async function updateUserSettings(
  db: Database,
  userId: number,
  updates: UserSettingsQuery,
): Promise<UserSettings> {
  const current = await getOrCreateUserSettings(db, userId);

  const merged: UserSettings = {
    language: updates.language ?? current.language,
    uiLanguage: updates.uiLanguage ?? current.uiLanguage,
    regions: updates.regions ?? current.regions,
    swipeLimit: updates.swipeLimit ?? current.swipeLimit,
  };

  await db
    .update(userSettings)
    .set({
      language: merged.language,
      uiLanguage: merged.uiLanguage,
      regions: merged.regions,
      swipeLimit: merged.swipeLimit,
      updatedAt: sql`(unixepoch() * 1000)`,
    })
    .where(eq(userSettings.userId, userId));

  return merged;
}
