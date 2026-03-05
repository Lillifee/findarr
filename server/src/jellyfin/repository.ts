import type { DB } from '../db/setup.js';
import type { JellyfinMedia } from './transformers.js';

// ============================================================================
// Jellyfin Media Sync Operations
// ============================================================================

/**
 * Upsert media from Jellyfin into the database
 * Updates jellyfinId and sets status to 'available' for matching TMDB items
 * Only updates when jellyfinId or status has actually changed
 */
export function upsertMediaFromJellyfin(db: DB, items: JellyfinMedia[]): number {
  const upsertMedia = db.prepare(`
    INSERT INTO media (
      tmdbId,
      mediaType,
      jellyfinId,
      status,
      createdAt,
      updatedAt
    )
    VALUES (?, ?, ?, 'available', unixepoch(), unixepoch())
    ON CONFLICT(tmdbId, mediaType) DO UPDATE SET
      jellyfinId = excluded.jellyfinId,
      status = 'available',
      updatedAt = unixepoch()
    WHERE
      jellyfinId IS NOT excluded.jellyfinId
      OR status != 'available'
  `);

  // Transaction automatically rolls back on error
  const syncTransaction = db.transaction((mediaItems: JellyfinMedia[]) => {
    let affectedRows = 0;

    for (const item of mediaItems) {
      const result = upsertMedia.run(item.tmdbId, item.mediaType, item.jellyfinId);

      if (result.changes > 0) {
        affectedRows++;
      }
    }

    return affectedRows;
  });

  return syncTransaction(items);
}
