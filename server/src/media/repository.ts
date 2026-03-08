import type { MediaStatus, Media, MediaRecord } from '@findarr/shared';
import { media } from '@findarr/shared';
import { and, eq, or } from 'drizzle-orm';
import type { DB } from '../db/setup.js';
import { Conflict, NotFound } from '../utils/errors.js';

/**
 * Database row from 'media' table (internal use)
 * Stores only application state - TMDB is the source of truth for metadata
 * For API responses, use Media with enriched state instead
 */
export interface MediaDbRow {
  id: number;
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  jellyfinId: string | null;
  status: MediaStatus;
  createdAt: number;
  updatedAt: number;
}

// ============================================================================
// Media Repository - Raw database operations for the media table
// ============================================================================

/**
 * Get media record by internal database ID
 */
export const getMediaById = async (db: DB, mediaId: number): Promise<MediaDbRow | undefined> =>
  (await db.query.media.findFirst({
    where: eq(media.id, mediaId),
  })) as MediaDbRow | undefined;

/**
 * Get media record by TMDB ID and type
 */
export const getMediaByTmdbId = async (
  db: DB,
  tmdbId: number,
  mediaType: 'movie' | 'tv'
): Promise<MediaDbRow | undefined> =>
  (await db.query.media.findFirst({
    where: and(eq(media.tmdbId, tmdbId), eq(media.mediaType, mediaType)),
  })) as MediaDbRow | undefined;

/**
 * Create a new media record in the database
 * Returns the newly created record
 */
export const createMedia = async (
  db: DB,
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  status: MediaStatus = 'pending'
) => {
  const result = await db
    .insert(media)
    .values({
      tmdbId,
      mediaType,
      status,
    })
    .returning({
      id: media.id,
    });

  if (!result[0]) throw Conflict('Failed to create media record');
  const createdMedia = await getMediaById(db, result[0].id);
  if (!createdMedia) throw Conflict('Failed to create media record');

  return createdMedia;
};

/**
 * Update the status of a media record
 */
export const updateMediaStatus = async (
  db: DB,
  mediaId: number,
  status: MediaStatus
): Promise<void> => {
  const result = await db
    .update(media)
    .set({
      status,
      updatedAt: Date.now(),
    })
    .where(eq(media.id, mediaId));

  if (result.changes === 0) {
    throw NotFound('Media not found');
  }
};

/**
 * Batch query for media records by TMDB IDs and types
 * Used for enriching multiple media items at once
 */
export async function getMediaRecordsBatch(
  db: DB,
  mediaItems: Media[]
): Promise<Map<string, MediaRecord>> {
  const mediaRecords = new Map<string, MediaRecord>();
  if (mediaItems.length === 0) return mediaRecords;

  // Build OR conditions for batch query
  const conditions = mediaItems.map(item =>
    and(eq(media.tmdbId, item.id), eq(media.mediaType, item.type))
  );

  const rows = await db.query.media.findMany({
    columns: {
      id: true,
      tmdbId: true,
      mediaType: true,
      status: true,
      jellyfinId: true,
      createdAt: true,
      updatedAt: true,
    },
    where: or(...conditions),
  });

  for (const row of rows) {
    const key = `${row.tmdbId}_${row.mediaType}`;
    mediaRecords.set(key, {
      id: row.id,
      status: row.status,
      jellyfinId: row.jellyfinId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  return mediaRecords;
}
