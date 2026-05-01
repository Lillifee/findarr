import type { UserSettings, UserSettingsQuery } from '@findarr/shared';
import { userSettings } from '@findarr/shared';
import { eq, sql } from 'drizzle-orm';
import type { DB } from '../db/setup.js';

const DEFAULT_USER_SETTINGS: UserSettings = {
  language: 'de-DE',
  regions: ['western'],
};

export async function getOrCreateUserSettings(db: DB, userId: number): Promise<UserSettings> {
  const existing = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
  });

  if (existing) {
    return existing as UserSettings;
  }

  await db.insert(userSettings).values({
    userId,
    language: DEFAULT_USER_SETTINGS.language,
    regions: DEFAULT_USER_SETTINGS.regions,
  });

  return DEFAULT_USER_SETTINGS;
}

export async function updateUserSettings(
  db: DB,
  userId: number,
  updates: UserSettingsQuery
): Promise<UserSettings> {
  const current = await getOrCreateUserSettings(db, userId);

  const merged: UserSettings = {
    language: updates.language ?? current.language,
    regions: updates.regions ?? current.regions,
  };

  await db
    .update(userSettings)
    .set({
      language: merged.language,
      regions: merged.regions,
      updatedAt: sql`(unixepoch() * 1000)`,
    })
    .where(eq(userSettings.userId, userId));

  return merged;
}
