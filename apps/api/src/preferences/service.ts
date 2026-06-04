import type { Genre, Keyword, InteractionType } from '@findarr/shared';

import type { Database } from '../db/service.js';
import { updateGenrePreference, updateKeywordPreference } from './repository.js';

// ============================================================================
// User Preferences Service - Business Logic
// ============================================================================

// Preference score constants (tunable)
const LIKE_SCORE = 1;
const DISLIKE_SCORE = -1;

/**
 * Update user genre preferences based on an interaction
 */
export async function updateGenreFromInteraction(
  db: Database,
  userId: number,
  genres: Genre[],
  action: InteractionType,
  isToggle: boolean,
) {
  // Calculate score delta based on action and toggle state
  const baseScore = action === 'liked' ? LIKE_SCORE : DISLIKE_SCORE;
  const scoreDelta = isToggle ? -baseScore : baseScore;

  // Update preferences for all genres in the media item
  await Promise.all(
    genres.map(async (genre) => updateGenrePreference(db, userId, genre, scoreDelta)),
  );
}

/**
 * Update user keyword preferences based on an interaction
 */
export async function updateKeywordFromInteraction(
  db: Database,
  userId: number,
  keywords: Keyword[],
  action: InteractionType,
  isToggle: boolean,
) {
  // Calculate score delta based on action and toggle state
  const baseScore = action === 'liked' ? LIKE_SCORE : DISLIKE_SCORE;
  const scoreDelta = isToggle ? -baseScore : baseScore;

  // Update preferences for all keywords in the media item
  await Promise.all(
    keywords.map(async (keyword) => updateKeywordPreference(db, userId, keyword, scoreDelta)),
  );
}

/**
 * Update user preferences (both genres and keywords) based on an interaction
 */
export async function updatePreferencesForInteraction(
  db: Database,
  userId: number,
  genres: Genre[],
  keywords: Keyword[] | undefined,
  action: InteractionType,
  isToggle: boolean,
) {
  // Update genre preferences
  await updateGenreFromInteraction(db, userId, genres, action, isToggle);

  // Update keyword preferences if keywords are available (from catalog_cache)
  if (keywords && keywords.length > 0) {
    await updateKeywordFromInteraction(db, userId, keywords, action, isToggle);
  }
}
