import { z } from 'zod';

import type { DbUserPreference } from './db.js';

export const UserPreferencesQuerySchema = z.object({
  type: z.enum(['movie', 'tv']),
});

export type UserPreferencesQuery = z.infer<typeof UserPreferencesQuerySchema>;

export type UserPreference = Omit<DbUserPreference, 'userId'>;
export type PreferenceKind = UserPreference['kind'];
export type PreferenceSubject = Pick<
  UserPreference,
  'mediaType' | 'kind' | 'subjectKey' | 'subjectName'
>;
export type UserRatingCountsByMediaType = Record<
  'movie' | 'tv',
  { likes: number; dislikes: number }
>;

export interface UserPreferenceSuggestion {
  id: number;
  name: string;
}

export interface UserPreferencePersonSuggestion {
  tmdbId: number;
  name: string;
  profilePath: string | undefined;
  knownForDepartment: string | undefined;
  score: number;
}

export interface UserPreferencesResponse {
  genres: UserPreferenceSuggestion[];
  keywords: UserPreferenceSuggestion[];
  people: UserPreferencePersonSuggestion[];
}

export const toPreferenceKey = (
  mediaType: UserPreference['mediaType'],
  kind: PreferenceKind,
  subjectKey: string,
) => `${mediaType}:${kind}:${subjectKey}`;
