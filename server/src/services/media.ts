import type { RequestStatus } from '@findarr/shared';
import type { DB } from '../db/setup.js';
import { NotFound } from '../utils/errors.js';

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
  status: RequestStatus;
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
  status: RequestStatus = 'pending'
): number => {
  const insertMedia = db.prepare(`
    INSERT INTO media (tmdbId, mediaType, status)
    VALUES (?, ?, ?)
  `);

  const result = insertMedia.run(tmdbId, mediaType, status);
  return result.lastInsertRowid as number;
};

/**
 * Update the status of a media record
 */
export const updateMediaStatus = (db: DB, mediaId: number, status: RequestStatus): void => {
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
