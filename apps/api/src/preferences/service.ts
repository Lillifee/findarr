import type { InteractionType } from '@findarr/shared/interaction';
import type { CastMember, Genre, Keyword } from '@findarr/shared/media';
import type { PreferenceSubject, UserPreferencesResponse } from '@findarr/shared/preferences';
import { isDefined } from '@findarr/shared/utils';

import type { Database } from '../db/service.js';
import type { TMDBService } from '../tmdb/service.js';
import type { UserService } from '../user/service.js';
import { getTopCast } from './helpers.js';
import { applyPreferenceDeltas, getUserPreferences } from './repository.js';

// ============================================================================
// User Preferences Service - Business Logic
// ============================================================================

// Preference score constants (tunable)
const LIKE_SCORE = 1;
const DISLIKE_SCORE = -1;

export interface PreferencesContext {
  db: Database;
  tmdb: TMDBService;
  user: UserService;
}

export function createPreferencesService(context: PreferencesContext) {
  async function updateForInteraction(
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

    await applyPreferenceDeltas(context.db, userId, subjects, scoreDelta, countDelta);
  }

  async function listForUser(userId: number): Promise<UserPreferencesResponse> {
    const preferences = await getUserPreferences(context.db, userId);
    const suggestions = {
      genres: [] as { id: number; name: string; score: number }[],
      keywords: [] as { id: number; name: string; score: number }[],
      people: [] as { id: number; name: string; score: number }[],
    };

    for (const preference of preferences.values()) {
      if (preference.score <= 0) {
        continue;
      }

      const id = Number(preference.subjectKey);
      if (!Number.isInteger(id) || id <= 0) {
        continue;
      }

      const collection =
        preference.kind === 'genre'
          ? suggestions.genres
          : preference.kind === 'keyword'
            ? suggestions.keywords
            : suggestions.people;
      collection.push({ id, name: preference.subjectName, score: preference.score });
    }

    for (const collection of Object.values(suggestions)) {
      collection.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    }

    const { language } = await context.user.getSettings(userId);
    const people = await Promise.all(
      suggestions.people.slice(0, 11).map(async ({ id: tmdbId, name, score }) => {
        const tmdbPeople = await context.tmdb.searchPeople({
          query: name,
          page: 1,
          type: 'both',
          language,
        });
        const match = tmdbPeople.find((person) => person.tmdbId === tmdbId);

        return {
          tmdbId,
          name,
          score,
          profilePath: match?.profilePath,
          knownForDepartment: match?.knownForDepartment,
        };
      }),
    );
    const genres = suggestions.genres.slice(0, 20).map(({ id, name }) => ({ id, name }));
    const keywords = suggestions.keywords.slice(0, 20).map(({ id, name }) => ({ id, name }));

    return { people, genres, keywords };
  }

  return { listForUser, updateForInteraction };
}

export type PreferencesService = ReturnType<typeof createPreferencesService>;
