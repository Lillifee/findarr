import type {
  Media,
  InteractionAction as InteractionType,
  MediaInteraction,
  MediaInteractionWithUser,
} from '@findarr/shared';
import type { DB } from '../db/setup.js';
import type { MediaDbRow } from '../media/repository.js';

// ============================================================================
// Basic CRUD Operations
// ============================================================================

/**
 * Add a user interaction with media (liked, disliked)
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
  const mediaIds = mediaItems
    .map(item => item.state?.record?.id)
    .filter((x): x is number => x !== undefined && x !== null);
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

  const mediaIds = mediaItems
    .map(item => item.state?.record?.id)
    .filter((x): x is number => x !== undefined && x !== null);
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

  const mediaIds = mediaItems
    .map(item => item.state?.record?.id)
    .filter((x): x is number => x !== undefined && x !== null);
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

// ============================================================================
// Query Operations - Fetch media by interaction criteria
// ============================================================================

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

/**
 * Get all media records with interactions (pending or requested status)
 * Excludes available media that came from Jellyfin sync
 * Returns media ordered by creation time (most recent first)
 */
export function getAllMediaWithInteractions(db: DB): MediaDbRow[] {
  return db
    .prepare<[], MediaDbRow>(
      `
      SELECT * FROM media
      WHERE status != 'available'
      ORDER BY createdAt DESC
    `
    )
    .all();
}

// ============================================================================
// Vote Counting & Aggregation
// ============================================================================

/**
 * Get vote counts for a specific media by internal media ID
 * Returns like count and dislike count
 */
export function getVoteCounts(db: DB, mediaId: number): { likes: number; dislikes: number } {
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
