import { media } from '@findarr/shared';
import { eq, isNotNull, sql } from 'drizzle-orm';
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
        type: item.type,
        jellyfinId: item.jellyfinId,
        status: 'available',
      })
      .onConflictDoUpdate({
        target: [media.tmdbId, media.type],
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

/**
 * Get all media with Jellyfin IDs for sync matching
 */
export async function getMediaWithJellyfinIds(db: DB): Promise<
  Array<{
    id: number;
    type: 'movie' | 'tv';
    jellyfinId: string;
    status: string;
  }>
> {
  const results = await db
    .select({
      id: media.id,
      type: media.type,
      jellyfinId: media.jellyfinId,
      status: media.status,
    })
    .from(media)
    .where(isNotNull(media.jellyfinId));

  // Filter out null values and assert type (we know they're not null due to where clause)
  return results.filter(
    (item): item is typeof item & { jellyfinId: string } => item.jellyfinId !== null
  );
}

/**
 * Clear removed items from Jellyfin
 * Resets jellyfinId and status for items no longer in Jellyfin library
 */
export async function clearRemovedJellyfinItems(db: DB, jellyfinIds: string[]): Promise<number> {
  if (jellyfinIds.length === 0) return 0;

  let cleared = 0;

  for (const id of jellyfinIds) {
    const current = await db.query.media.findFirst({
      where: eq(media.jellyfinId, id),
      columns: { id: true, status: true, arrId: true },
    });

    if (!current) continue;

    // Reset to pending and let Arr sync handle updating status on next run
    await db
      .update(media)
      .set({
        jellyfinId: null,
        status: 'pending',
        updatedAt: Date.now(),
      })
      .where(eq(media.id, current.id));

    cleared++;
  }

  return cleared;
}
