import type { InteractionType } from '@findarr/shared/interaction';
import type { CastMember, Genre, Keyword } from '@findarr/shared/media';
import type { PreferenceSubject } from '@findarr/shared/preferences';
import { isDefined } from '@findarr/shared/utils';

import type { Database } from '../db/service.js';
import { applyPreferenceDeltas } from './repository.js';
import { getTopCast } from './subjects.js';

// ============================================================================
// User Preferences Service - Business Logic
// ============================================================================

// Preference score constants (tunable)
const LIKE_SCORE = 1;
const DISLIKE_SCORE = -1;

/**
 * Update user genre, keyword, and top-cast preferences based on an interaction. All upserts
 * run in a single transaction (one commit) to avoid a per-row fsync on slow
 * storage.
 */
export async function updatePreferencesForInteraction(
  db: Database,
  userId: number,
  genres: Genre[],
  keywords: Keyword[] | undefined,
  cast: CastMember[] | undefined,
  previousAction: InteractionType | undefined,
  nextAction: InteractionType | undefined,
) {
  const toScore = (action: InteractionType | undefined) =>
    action === 'liked' ? LIKE_SCORE : action === 'disliked' ? DISLIKE_SCORE : 0;

  const scoreDelta = toScore(nextAction) - toScore(previousAction);
  const countDelta = Number(isDefined(nextAction)) - Number(isDefined(previousAction));

  if (scoreDelta === 0 && countDelta === 0) {
    return;
  }

  const subjects: PreferenceSubject[] = [
    ...genres.map((genre) => ({
      kind: 'genre' as const,
      subjectKey: String(genre.id),
      subjectName: genre.name,
    })),
    ...(keywords ?? []).map((keyword) => ({
      kind: 'keyword' as const,
      subjectKey: String(keyword.id),
      subjectName: keyword.name,
    })),
    ...getTopCast(cast).map((member) => ({
      kind: 'cast' as const,
      subjectKey: String(member.id),
      subjectName: member.name,
    })),
  ];

  await applyPreferenceDeltas(db, userId, subjects, scoreDelta, countDelta);
}
