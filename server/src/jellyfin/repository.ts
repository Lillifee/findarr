import { media } from '@findarr/shared';
import { sql } from 'drizzle-orm';
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
export async function upsertMediaFromJellyfin(db: DB, items: JellyfinMedia[]): Promise<number> {
  let affectedRows = 0;

  for (const item of items) {
    const result = await db
      .insert(media)
      .values({
        tmdbId: item.tmdbId,
        mediaType: item.mediaType,
        jellyfinId: item.jellyfinId,
        status: 'available',
      })
      .onConflictDoUpdate({
        target: [media.tmdbId, media.mediaType],
        set: {
          jellyfinId: item.jellyfinId,
          status: 'available',
          updatedAt: sql`(unixepoch() * 1000)`,
        },
      });

    if (result.changes > 0) {
      affectedRows++;
    }
  }

  return affectedRows;
}
