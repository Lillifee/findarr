import { userPreferences } from '@findarr/shared/db';
import {
  toPreferenceKey,
  type PreferenceSubject,
  type UserPreference,
} from '@findarr/shared/preferences';
import { and, eq, lte, sql } from 'drizzle-orm';

import type { Database } from '../db/service.js';

/**
 * Get all preferences for a user, keyed by kind and subject key.
 */
export async function getUserPreferences(db: Database, userId: number) {
  const results = await db
    .select({
      kind: userPreferences.kind,
      subjectKey: userPreferences.subjectKey,
      subjectName: userPreferences.subjectName,
      score: userPreferences.score,
      count: userPreferences.count,
    })
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId));

  const preferenceMap = new Map<string, UserPreference>();

  for (const preference of results) {
    preferenceMap.set(toPreferenceKey(preference.kind, preference.subjectKey), preference);
  }

  return preferenceMap;
}

/**
 * Apply score deltas for preference subjects in a single transaction.
 */
export async function applyPreferenceDeltas(
  db: Database,
  userId: number,
  subjects: PreferenceSubject[],
  scoreDelta: number,
  countDelta = 1,
): Promise<void> {
  db.transaction((tx) => {
    for (const subject of subjects) {
      tx.insert(userPreferences)
        .values({
          userId,
          ...subject,
          score: scoreDelta,
          count: countDelta,
        })
        .onConflictDoUpdate({
          target: [userPreferences.userId, userPreferences.kind, userPreferences.subjectKey],
          set: {
            score: sql`${userPreferences.score} + ${scoreDelta}`,
            count: sql`${userPreferences.count} + ${countDelta}`,
          },
        })
        .run();
    }

    tx.delete(userPreferences)
      .where(and(eq(userPreferences.userId, userId), lte(userPreferences.count, 0)))
      .run();
  });
}
