import type { DbUserPreference } from './db.js';

export type UserPreference = Omit<DbUserPreference, 'userId'>;
export type PreferenceKind = UserPreference['kind'];
export type PreferenceSubject = Pick<UserPreference, 'kind' | 'subjectKey' | 'subjectName'>;
export interface UserRatingCounts {
  likes: number;
  dislikes: number;
}

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

export const toPreferenceKey = (kind: PreferenceKind, subjectKey: string) =>
  `${kind}:${subjectKey}`;
