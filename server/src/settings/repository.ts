import type { UserSettingsBody, UserSettings } from '@findarr/shared';
import { userSettings } from '@findarr/shared';
import { eq, sql } from 'drizzle-orm';
import type { DB } from '../db/setup.js';

const DEFAULT_USER_SETTINGS: UserSettings = {
  language: 'de-DE',
  regionGroups: ['western'],
  withGenres: [],
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
    regionGroups: DEFAULT_USER_SETTINGS.regionGroups,
    withGenres: DEFAULT_USER_SETTINGS.withGenres,
  });

  return DEFAULT_USER_SETTINGS;
}

export async function updateUserSettings(
  db: DB,
  userId: number,
  updates: UserSettingsBody
): Promise<UserSettings> {
  const current = await getOrCreateUserSettings(db, userId);

  const merged: UserSettings = {
    language: updates.language ?? current.language,
    regionGroups: updates.regionGroups ?? current.regionGroups,
    withGenres: updates.withGenres ?? current.withGenres,
  };

  await db
    .update(userSettings)
    .set({
      language: merged.language,
      regionGroups: merged.regionGroups,
      withGenres: merged.withGenres,
      updatedAt: sql`(unixepoch() * 1000)`,
    })
    .where(eq(userSettings.userId, userId));

  return merged;
}
