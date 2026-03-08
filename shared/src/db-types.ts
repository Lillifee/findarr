import type { InferSelectModel } from 'drizzle-orm';
import { media, users, userMediaInteractions } from './db-schema.js';

// ============================================================================
// Database Types - Inferred from Drizzle Schema
// ============================================================================

export type DbUser = InferSelectModel<typeof users>;
export type DbMedia = InferSelectModel<typeof media>;
export type DbUserMediaInteraction = InferSelectModel<typeof userMediaInteractions>;

// ============================================================================
// Composite Types - For Relations and Complex Queries
// ============================================================================

export type User = Omit<DbUser, 'passwordHash'>;

export type MediaUser = Omit<User, 'role'>;
export type MediaRecord = Omit<DbMedia, 'tmdbId' | 'mediaType'>;
export type MediaInteraction = Omit<DbUserMediaInteraction, 'mediaId' | 'userId'>;

export interface MediaInteractionWithUser extends MediaInteraction {
  user?: MediaUser;
}

export interface MediaVotes {
  likes?: number;
  dislikes?: number;
}
