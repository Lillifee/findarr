import {
  type CreateMediaInteraction,
  type Media,
  type InteractionAction as InteractionType,
  type MediaInteraction,
  isDefined,
  type MediaInteractionWithUser,
  type User,
} from '@findarr/shared';
import type { DB } from '../db/setup.js';
import type { TMDBService } from '../tmdb/service.js';
import { fetchTMDBDetails, enrichWithInteractions } from './enrichment.js';
import {
  type MediaDbRow,
  createMedia,
  getMediaById,
  getMediaByTmdbId,
  updateMediaStatus,
} from './media.js';

const LIKE_THRESHOLD = 3;

/**
 * Add a user interaction with media (request, like, dislike)
 */
export function addInteraction(
  db: DB,
  userId: number,
  mediaId: number,
  action: InteractionType
): void {
  const stmt = db.prepare(`
    INSERT INTO user_media_interactions (userId, mediaId, action)
    VALUES (?, ?, ?)
    ON CONFLICT(mediaId, userId, action) DO NOTHING
  `);

  stmt.run(userId, mediaId, action);
}

/**
 * Check if a user has a specific interaction with media
 */
export function hasInteraction(
  db: DB,
  userId: number,
  mediaId: number,
  action: InteractionType
): boolean {
  const stmt = db.prepare<[number, number, string], { count: number }>(`
    SELECT COUNT(*) as count
    FROM user_media_interactions
    WHERE userId = ? AND mediaId = ? AND action = ?
  `);

  const result = stmt.get(userId, mediaId, action);
  return (result?.count || 0) > 0;
}

/**
 * Remove all interactions for a user on a specific media
 */
export function removeAllInteractions(db: DB, userId: number, mediaId: number): void {
  const stmt = db.prepare(`
    DELETE FROM user_media_interactions
    WHERE userId = ? AND mediaId = ?
  `);

  stmt.run(userId, mediaId);
}

// ============================================================================
// Batch Query Operations - Optimized queries for enriching multiple items
// ============================================================================

/**
 * Batch query for user interactions on multiple media items
 * Used for enriching media arrays with user-specific interaction state
 */
export function getInteractionsBatch(
  db: DB,
  mediaItems: Media[],
  userId: number
): Map<number, MediaInteraction[]> {
  const interactionsMap = new Map<number, MediaInteraction[]>();

  // Extract media IDs from items that have records
  const mediaIds = mediaItems.map(item => item.state?.record?.id).filter(x => isDefined(x));
  if (mediaIds.length === 0) return interactionsMap;

  const placeholders = mediaIds.map(() => '?').join(',');
  const query = `
    SELECT 
      mediaId,
      action,
      createdAt
    FROM user_media_interactions
    WHERE userId = ? AND mediaId IN (${placeholders})
  `;

  const rows = db
    .prepare<unknown[], { mediaId: number } & MediaInteraction>(query)
    .all(userId, ...mediaIds);

  for (const { mediaId, action, createdAt } of rows) {
    const interactions = interactionsMap.get(mediaId) || [];
    interactions.push({ action, createdAt });
    interactionsMap.set(mediaId, interactions);
  }

  return interactionsMap;
}

/**
 * Batch query for ALL interactions on multiple media items with user info
 * Used for admin views that show all user interactions
 */
export function getAllInteractionsWithUsersBatch(
  db: DB,
  mediaItems: Media[]
): Map<number, Array<MediaInteractionWithUser>> {
  const allInteractionsMap = new Map<number, Array<MediaInteractionWithUser>>();

  const mediaIds = mediaItems.map(item => item.state?.record?.id).filter(x => isDefined(x));
  if (mediaIds.length === 0) return allInteractionsMap;

  const placeholders = mediaIds.map(() => '?').join(',');
  const query = `
    SELECT 
      i.mediaId,
      i.action,
      i.createdAt,
      u.id,
      u.email,
      u.displayName
    FROM user_media_interactions i
    INNER JOIN users u ON i.userId = u.id
    WHERE i.mediaId IN (${placeholders})
    ORDER BY i.createdAt DESC
  `;

  const rows = db
    .prepare<
      unknown[],
      { mediaId: number } & MediaInteraction & { id: number; email: string; displayName: string }
    >(query)
    .all(...mediaIds);

  for (const { mediaId, action, createdAt, id, email, displayName } of rows) {
    const interactions = allInteractionsMap.get(mediaId) || [];
    interactions.push({ action, createdAt, userInfo: { id, email, displayName } });
    allInteractionsMap.set(mediaId, interactions);
  }

  return allInteractionsMap;
}

/**
 * Batch query for vote counts on multiple media items
 * Returns aggregated like and dislike counts for all media
 */
export function getVoteCountsBatch(
  db: DB,
  mediaItems: Media[]
): Map<number, { likes: number; dislikes: number }> {
  const votesMap = new Map<number, { likes: number; dislikes: number }>();

  const mediaIds = mediaItems.map(item => item.state?.record?.id).filter(x => isDefined(x));
  if (mediaIds.length === 0) return votesMap;

  const placeholders = mediaIds.map(() => '?').join(',');
  const query = `
    SELECT 
      mediaId,
      SUM(CASE WHEN action = 'liked' THEN 1 ELSE 0 END) as likes,
      SUM(CASE WHEN action = 'disliked' THEN 1 ELSE 0 END) as dislikes
    FROM user_media_interactions
    WHERE mediaId IN (${placeholders})
    GROUP BY mediaId
  `;

  const rows = db
    .prepare<unknown[], { mediaId: number; likes: number; dislikes: number }>(query)
    .all(...mediaIds);

  for (const { mediaId, likes, dislikes } of rows) {
    votesMap.set(mediaId, { likes: likes || 0, dislikes: dislikes || 0 });
  }

  return votesMap;
}

/**
 * Get all media records where a user has ANY interaction (liked or disliked)
 * Returns the media DB rows ordered by interaction creation time (most recent first)
 */
export function getMediaByUserInteractions(db: DB, userId: number): MediaDbRow[] {
  return db
    .prepare<[number], MediaDbRow>(
      `
      SELECT DISTINCT m.*
      FROM media m
      INNER JOIN user_media_interactions i ON m.id = i.mediaId
      WHERE i.userId = ?
      ORDER BY i.createdAt DESC
    `
    )
    .all(userId);
}

/**
 * Get all media records where a user has a specific interaction
 * Returns the media DB rows ordered by interaction creation time (most recent first)
 */
export function getMediaByUserInteraction(
  db: DB,
  userId: number,
  action: InteractionType
): MediaDbRow[] {
  return db
    .prepare<[number, string], MediaDbRow>(
      `
      SELECT m.*
      FROM media m
      INNER JOIN user_media_interactions i ON m.id = i.mediaId
      WHERE i.userId = ? AND i.action = ?
      ORDER BY i.createdAt DESC
    `
    )
    .all(userId, action);
}

/**
 * Get all media records that have a specific interaction from any user
 * Returns distinct media records ordered by media creation time (most recent first)
 */
export function getMediaByInteraction(db: DB, action: InteractionType): MediaDbRow[] {
  return db
    .prepare<[string], MediaDbRow>(
      `
      SELECT DISTINCT m.*
      FROM media m
      INNER JOIN user_media_interactions i ON m.id = i.mediaId
      WHERE i.action = ?
      ORDER BY m.createdAt DESC
    `
    )
    .all(action);
}

// ============================================================================
// Vote Counting & Aggregation
// ============================================================================

/**
 * Get vote counts for a specific media by internal media ID
 * Returns like count, dislike count, and net votes (likes - dislikes)
 */
export function getVoteCounts(db: DB, mediaId: number) {
  const result = db
    .prepare<[number], { likes: number; dislikes: number }>(
      `
      SELECT 
        SUM(CASE WHEN action = 'liked' THEN 1 ELSE 0 END) as likes,
        SUM(CASE WHEN action = 'disliked' THEN 1 ELSE 0 END) as dislikes
      FROM user_media_interactions
      WHERE mediaId = ?
    `
    )
    .get(mediaId);

  const likes = result?.likes || 0;
  const dislikes = result?.dislikes || 0;

  return { likes, dislikes };
}

// ============================================================================
// Business Logic - High-level workflows for interaction management
// ============================================================================

// ============================================================================
// Create Operations
// ============================================================================

/**
 * Create or toggle a media interaction (like/dislike)
 * Automatically creates media request when vote threshold is met (3 votes) or if admin likes it
 */
export const createInteraction = (db: DB, data: CreateMediaInteraction, user?: User) => {
  if (!user?.id) return;

  // Start transaction
  const transaction = db.transaction(() => {
    // Get or create media record
    const media =
      getMediaByTmdbId(db, data.tmdbId, data.mediaType) ??
      createMedia(db, data.tmdbId, data.mediaType);

    // Check if this is a toggle (user clicking same action twice to remove it)
    const isToggle = hasInteraction(db, user.id, media.id, data.action);

    // Remove all existing interactions for this user on this media
    removeAllInteractions(db, user.id, media.id);

    // Add new interaction only if not toggling off
    if (!isToggle) {
      addInteraction(db, user.id, media.id, data.action);
    }

    // Calculate votes and check if auto-request threshold is met
    const { likes } = getVoteCounts(db, media.id);
    const isAdmin = user.role === 'admin';

    // Auto-request if: admin liked it OR net votes >= 3
    if ((likes >= LIKE_THRESHOLD || isAdmin) && data.action === 'liked') {
      const currentMedia = getMediaById(db, media.id);
      if (currentMedia && currentMedia.status === 'pending') {
        // Update to requested status (trigger download workflow)
        updateMediaStatus(db, media.id, 'requested');
      }
    }

    // Return the updated media record
    return getMediaById(db, media.id);
  });

  return transaction();
};

/**
 * Get user's interacted media (likes AND dislikes) enriched with TMDB metadata, interactions, and vote counts
 */
export async function getUserInteractionsEnriched(
  tmdbService: TMDBService,
  db: DB,
  userId?: number
): Promise<Media[]> {
  if (!userId) return [];

  // Get all media where user has any interaction (liked or disliked)
  const dbRecords = getMediaByUserInteractions(db, userId);

  // Fetch TMDB details for all interacted media
  const enrichedMedia = await fetchTMDBDetails(tmdbService, dbRecords);

  // Add user interactions and vote counts in optimized batch query
  return enrichWithInteractions(db, enrichedMedia, userId);
}

/**
 * Get all media with interactions enriched with TMDB metadata, all user interactions, and vote counts (admin view)
 */
export async function getAllInteractionsEnriched(
  tmdbService: TMDBService,
  db: DB
): Promise<Media[]> {
  // Get all media that has at least one interaction (any status: pending, requested, available)
  const dbRecords = db
    .prepare<[], MediaDbRow>(
      `
      SELECT * FROM media
      ORDER BY createdAt DESC
    `
    )
    .all();

  if (dbRecords.length === 0) return [];

  // Fetch TMDB details for all media with interactions
  const enrichedMedia = await fetchTMDBDetails(tmdbService, dbRecords);

  // Add all interactions with user info and vote counts in optimized batch queries
  return enrichWithInteractions(db, enrichedMedia);
}
