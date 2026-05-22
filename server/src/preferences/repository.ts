import {
  userGenrePreferences,
  userKeywordPreferences,
  type Genre,
  type Keyword,
  type UserGenrePreference,
  type UserKeywordPreference,
} from '@findarr/shared';
import { eq, sql } from 'drizzle-orm';
import type { Database } from '../db/service.js';

// ============================================================================
// User Genre Preferences - Repository
// ============================================================================

/**
 * Get all genre preferences for a user
 * Returns a map of genreId -> preference data
 */
export async function getUserGenrePreferences(db: Database, userId: number) {
  const results = await db
    .select({
      genreId: userGenrePreferences.genreId,
      genreName: userGenrePreferences.genreName,
      score: userGenrePreferences.score,
      count: userGenrePreferences.count,
    })
    .from(userGenrePreferences)
    .where(eq(userGenrePreferences.userId, userId));

  const preferenceMap = new Map<number, UserGenrePreference>();

  for (const pref of results) {
    preferenceMap.set(pref.genreId, pref);
  }

  return preferenceMap;
}

/**
 * Update genre preferences for a user (upsert pattern)
 * Increments/decrements preference score
 */
export async function updateGenrePreference(
  db: Database,
  userId: number,
  genre: Genre,
  scoreDelta: number
) {
  await db
    .insert(userGenrePreferences)
    .values({
      userId,
      genreId: genre.id,
      genreName: genre.name,
      score: scoreDelta,
      count: 1,
    })
    .onConflictDoUpdate({
      target: [userGenrePreferences.userId, userGenrePreferences.genreId],
      set: {
        score: sql`${userGenrePreferences.score} + ${scoreDelta}`,
        count: sql`${userGenrePreferences.count} + 1`,
      },
    });
}

// ============================================================================
// User Keyword Preferences - Repository
// ============================================================================

/**
 * Get all keyword preferences for a user
 * Returns a map of keywordId -> preference data
 */
export async function getUserKeywordPreferences(db: Database, userId: number) {
  const results = await db
    .select({
      keywordId: userKeywordPreferences.keywordId,
      keywordName: userKeywordPreferences.keywordName,
      score: userKeywordPreferences.score,
      count: userKeywordPreferences.count,
    })
    .from(userKeywordPreferences)
    .where(eq(userKeywordPreferences.userId, userId));

  const preferenceMap = new Map<number, UserKeywordPreference>();

  for (const pref of results) {
    preferenceMap.set(pref.keywordId, pref);
  }

  return preferenceMap;
}

/**
 * Update keyword preferences for a user (upsert pattern)
 * Increments/decrements preference score
 */
export async function updateKeywordPreference(
  db: Database,
  userId: number,
  keyword: Keyword,
  scoreDelta: number
) {
  await db
    .insert(userKeywordPreferences)
    .values({
      userId,
      keywordId: keyword.id,
      keywordName: keyword.name,
      score: scoreDelta,
      count: 1,
    })
    .onConflictDoUpdate({
      target: [userKeywordPreferences.userId, userKeywordPreferences.keywordId],
      set: {
        score: sql`${userKeywordPreferences.score} + ${scoreDelta}`,
        count: sql`${userKeywordPreferences.count} + 1`,
      },
    });
}
