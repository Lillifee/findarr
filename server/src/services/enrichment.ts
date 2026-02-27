import {
  type Media,
  type MediaRecord,
  type MediaInteraction,
  isDefined,
  type MediaInteractionWithUser,
} from '@findarr/shared';
import type { DB } from '../db/setup.js';
import type { TMDBService } from '../tmdb/service.js';
import type { MediaDbRow } from './media.js';

// ============================================================================
// Enrichment Utilities - Add database state to TMDB media items
// Split into separate concerns: media records and user interactions
// ============================================================================

/**
 * Add database records (status, jellyfinId) to TMDB media items
 *
 * @param db Database instance
 * @param mediaItems Media items from TMDB
 * @returns Media items enriched with state.record
 */
export function addDatabaseRecords(db: DB, mediaItems: Media[]): Media[] {
  if (mediaItems.length === 0) return mediaItems;

  const mediaRecords = getMediaRecords(db, mediaItems);

  return mediaItems.map(item => {
    const key = `${item.id}_${item.type}`;
    const record = mediaRecords.get(key);

    if (!record) return item;

    return { ...item, state: { ...item.state, record } };
  });
}

/**
 * Add user interactions (liked, disliked, requested) to media items
 * Requires items to already have state.record with database IDs
 */
export function addInteractions(db: DB, mediaItems: Media[], userId: number): Media[] {
  const interactionsMap = getInteractions(db, mediaItems, userId);

  return mediaItems.map(item => {
    const mediaId = item.state?.record?.id;
    if (!mediaId) return item;

    const interactions = interactionsMap.get(mediaId);
    if (!interactions) return item;

    return { ...item, state: { ...item.state, interactions } };
  });
}

/**
 * Add all interactions with user info (for admin views)
 * Requires items to already have state.record with database IDs
 */
export function addAllInteractions(db: DB, mediaItems: Media[]): Media[] {
  const allInteractionsMap = getAllInteractionsWithUsers(db, mediaItems);

  return mediaItems.map(item => {
    const mediaId = item.state?.record?.id;
    if (!mediaId) return item;

    const allInteractions = allInteractionsMap.get(mediaId);
    if (!allInteractions) return item;

    return { ...item, state: { ...item.state, allInteractions } };
  });
}

/**
 * Query media records from database
 */
function getMediaRecords(db: DB, mediaItems: Media[]): Map<string, MediaRecord> {
  const mediaRecords = new Map<string, MediaRecord>();
  if (mediaItems.length === 0) return mediaRecords;

  const conditions = mediaItems.map(() => '(tmdbId = ? AND mediaType = ?)').join(' OR ');
  const params = mediaItems.flatMap(item => [item.id, item.type]);

  const query = `
    SELECT 
      id,
      tmdbId,
      mediaType,
      status,
      jellyfinId,
      createdAt,
      updatedAt
    FROM media
    WHERE ${conditions}
  `;

  const rows = db.prepare<unknown[], MediaDbRow>(query).all(...params);

  for (const { tmdbId, mediaType, id, status, jellyfinId, createdAt, updatedAt } of rows) {
    const key = `${tmdbId}_${mediaType}`;
    mediaRecords.set(key, { id, status, jellyfinId, createdAt, updatedAt });
  }

  return mediaRecords;
}

/**
 * Query user interactions for media items
 * Only queries for items that have a database record ID
 */
function getInteractions(
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
 * Query ALL interactions for media items with user info (for admin views)
 */
function getAllInteractionsWithUsers(
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
      i.userId,
      u.email as userEmail,
      u.displayName as userDisplayName
    FROM user_media_interactions i
    INNER JOIN users u ON i.userId = u.id
    WHERE i.mediaId IN (${placeholders})
    ORDER BY i.createdAt DESC
  `;

  const rows = db
    .prepare<unknown[], { mediaId: number } & MediaInteractionWithUser>(query)
    .all(...mediaIds);

  for (const { mediaId, action, createdAt, userId, userEmail, userDisplayName } of rows) {
    const interactions = allInteractionsMap.get(mediaId) || [];
    interactions.push({ action, createdAt, userId, userEmail, userDisplayName });
    allInteractionsMap.set(mediaId, interactions);
  }

  return allInteractionsMap;
}

/**
 * Fetch TMDB details for database records
 * Returns Media items with TMDB data and database record attached
 */
export async function fetchTMDBDetails(
  tmdbService: TMDBService,
  mediaDbRows: MediaDbRow[]
): Promise<Media[]> {
  const results = await Promise.all(
    mediaDbRows.map(async ({ tmdbId, mediaType, id, status, jellyfinId, createdAt, updatedAt }) => {
      const details = await tmdbService
        .getDetails({ id: tmdbId, type: mediaType })
        .catch(() => undefined);

      // Attach database record to TMDB data
      return (
        details && {
          ...details,
          state: { record: { id, status, jellyfinId, createdAt, updatedAt } },
        }
      );
    })
  );

  return results.filter(x => isDefined(x));
}
