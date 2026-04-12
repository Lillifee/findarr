import type { InferSelectModel } from 'drizzle-orm';
import {
  media,
  users,
  userMediaInteractions,
  userGenrePreferences,
  userKeywordPreferences,
  catalogCache,
} from './db-schema.js';

// ============================================================================
// Database Types - Inferred from Drizzle Schema
// ============================================================================

export type DbUser = InferSelectModel<typeof users>;
export type DbMedia = InferSelectModel<typeof media>;
export type DbUserMediaInteraction = InferSelectModel<typeof userMediaInteractions>;
export type DbUserGenrePreference = InferSelectModel<typeof userGenrePreferences>;
export type DbUserKeywordPreference = InferSelectModel<typeof userKeywordPreferences>;
export type DbCatalogCache = InferSelectModel<typeof catalogCache>;

// ============================================================================
// Composite Types - For Relations and Complex Queries
// ============================================================================

export type User = Omit<DbUser, 'passwordHash'>;
export type UserGenrePreference = Omit<DbUserGenrePreference, 'userId'>;
export type UserKeywordPreference = Omit<DbUserKeywordPreference, 'userId'>;

export type MediaUser = Omit<User, 'role'>;
export type MediaRecord = Omit<DbMedia, 'tmdbId' | 'type'>;
export type MediaInteraction = Omit<DbUserMediaInteraction, 'mediaId' | 'userId'>;

export interface MediaInteractionWithUser extends MediaInteraction {
  user?: MediaUser;
}

export interface MediaVotes {
  likes?: number;
  dislikes?: number;
}

export type SeasonRecord = {
  seasonNumber: number;
  // Status progression: none (not in Sonarr) -> requested (user wants it) -> monitored (in Sonarr) -> downloaded (complete) -> available (in Jellyfin)
  status: 'none' | 'requested' | 'monitored' | 'downloaded' | 'available';
};
