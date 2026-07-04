import type { InteractionType } from '@findarr/shared/interaction';
import type { Genre, Keyword } from '@findarr/shared/media';

import type { Database } from '../db/service.js';
import { applyPreferenceDeltas } from './repository.js';

// ============================================================================
// User Preferences Service - Business Logic
// ============================================================================

// Preference score constants (tunable)
const LIKE_SCORE = 1;
const DISLIKE_SCORE = -1;

/**
 * Update user genre + keyword preferences based on an interaction. All upserts
 * run in a single transaction (one commit) to avoid a per-row fsync on slow
 * storage.
 */
export async function updatePreferencesForInteraction(
  db: Database,
  userId: number,
  genres: Genre[],
  keywords: Keyword[] | undefined,
  action: InteractionType,
  isToggle: boolean,
) {
  // Calculate score delta based on action and toggle state.
  const baseScore = action === 'liked' ? LIKE_SCORE : DISLIKE_SCORE;
  const scoreDelta = isToggle ? -baseScore : baseScore;

  await applyPreferenceDeltas(db, userId, genres, keywords ?? [], scoreDelta);
}
