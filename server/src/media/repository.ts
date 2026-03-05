import type { MediaStatus, Media, MediaRecord } from '@findarr/shared';
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
export const getMediaById = (db: DB, mediaId: number): MediaDbRow | undefined =>
  db
    .prepare<[number], MediaDbRow>(
      `SELECT 
        id, tmdbId, mediaType, 
        jellyfinId, status, createdAt, updatedAt
      FROM media 
      WHERE id = ?`
    )
    .get(mediaId);

/**
 * Get media record by TMDB ID and type
 */
export const getMediaByTmdbId = (
  db: DB,
  tmdbId: number,
  mediaType: 'movie' | 'tv'
): MediaDbRow | undefined =>
  db
    .prepare<[number, string], MediaDbRow>(
      `SELECT 
        id, tmdbId, mediaType, 
        jellyfinId, status, createdAt, updatedAt
      FROM media 
      WHERE tmdbId = ? AND mediaType = ?`
    )
    .get(tmdbId, mediaType);

/**
 * Create a new media record in the database
 * Returns the ID of the newly created record
 */
export const createMedia = (
  db: DB,
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  status: MediaStatus = 'pending'
) => {
  const insertMedia = db.prepare(`
    INSERT INTO media (tmdbId, mediaType, status)
    VALUES (?, ?, ?)
  `);

  const result = insertMedia.run(tmdbId, mediaType, status);

  const media = getMediaById(db, result.lastInsertRowid as number);
  if (!media) throw Conflict('Failed to create media record');

  return media;
};

/**
 * Update the status of a media record
 */
export const updateMediaStatus = (db: DB, mediaId: number, status: MediaStatus): void => {
  const update = db
    .prepare(
      `
      UPDATE media
      SET status = ?, updatedAt = unixepoch()
      WHERE id = ?
      `
    )
    .run(status, mediaId);

  if (update.changes === 0) {
    throw NotFound('Media not found');
  }
};

/**
 * Batch query for media records by TMDB IDs and types
 * Used for enriching multiple media items at once
 */
export function getMediaRecordsBatch(db: DB, mediaItems: Media[]): Map<string, MediaRecord> {
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
