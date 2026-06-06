import { userSettings } from '@findarr/shared/db';
import type { UserSettings, UserSettingsQuery } from '@findarr/shared/settings';
import { eq, sql } from 'drizzle-orm';

import type { Database } from '../db/service.js';

const DEFAULT_USER_SETTINGS: UserSettings = {
  language: 'de-DE',
  regions: ['western'],
  swipeLimit: 60,
};

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
    regions: DEFAULT_USER_SETTINGS.regions,
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
    regions: updates.regions ?? current.regions,
    swipeLimit: updates.swipeLimit ?? current.swipeLimit,
  };

  await db
    .update(userSettings)
    .set({
      language: merged.language,
      regions: merged.regions,
      swipeLimit: merged.swipeLimit,
      updatedAt: sql`(unixepoch() * 1000)`,
    })
    .where(eq(userSettings.userId, userId));

  return merged;
}
