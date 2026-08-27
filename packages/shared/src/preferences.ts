import type { DbUserPreference } from './db.js';

export type UserPreference = Omit<DbUserPreference, 'userId'>;
export type PreferenceKind = UserPreference['kind'];
export type PreferenceSubject = Pick<UserPreference, 'kind' | 'subjectKey' | 'subjectName'>;
export interface UserRatingCounts {
  likes: number;
  dislikes: number;
}

export const toPreferenceKey = (kind: PreferenceKind, subjectKey: string) =>
  `${kind}:${subjectKey}`;
