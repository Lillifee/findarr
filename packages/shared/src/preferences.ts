import type { DbUserGenrePreference, DbUserKeywordPreference } from './db.js';

export type UserGenrePreference = Omit<DbUserGenrePreference, 'userId'>;
export type UserKeywordPreference = Omit<DbUserKeywordPreference, 'userId'>;
