import type { DbMedia, MediaStatus } from '@findarr/shared';
import { media } from '@findarr/shared';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { DB } from '../db/setup.js';

/**
 * Update media record with external IDs from Radarr/Sonarr
 */
export async function updateMediaExternalIds(
  db: DB,
  mediaId: number,
  externalIds: {
    radarrId?: number;
    sonarrId?: number;
    tvdbId?: number;
  }
): Promise<void> {
  const updateData: Record<string, unknown> = {
    ...externalIds,
    updatedAt: Date.now(),
  };

  // Filter out undefined values
  const filteredData = Object.fromEntries(
    Object.entries(updateData).filter(([, value]) => value !== undefined)
  );

  // Only update if we actually have fields besides updatedAt
  if (Object.keys(filteredData).length > 1) {
    await db.update(media).set(filteredData).where(eq(media.id, mediaId));
  }
}

/**
 * Get all TV shows without TVDB ID for enrichment
 */
export async function getMediaWithoutTvdbId(
  db: DB
): Promise<Array<Pick<DbMedia, 'id' | 'tmdbId' | 'type'>>> {
  return db
    .select({
      id: media.id,
      tmdbId: media.tmdbId,
      type: media.type,
    })
    .from(media)
    .where(and(eq(media.type, 'tv'), isNull(media.tvdbId)));
}

/**
 * Upsert media from Radarr/Sonarr sync (batched for performance)
 */
export async function upsertMediaFromArr(
  db: DB,
  items: Array<{
    type: 'movie' | 'tv';
    tmdbId: number;
    tvdbId?: number;
    radarrId?: number;
    sonarrId?: number;
    status: MediaStatus;
  }>
): Promise<void> {
  if (items.length === 0) return;

  const now = Date.now();

  await db
    .insert(media)
    .values(
      items.map(item => ({
        ...item,
        createdAt: now,
        updatedAt: now,
      }))
    )
    .onConflictDoUpdate({
      target: [media.tmdbId, media.type],
      set: {
        tvdbId: sql`excluded.tvdbId`,
        radarrId: sql`excluded.radarrId`,
        sonarrId: sql`excluded.sonarrId`,
        status: sql`excluded.status`,
        updatedAt: now,
      },
    });
}

/**
 * Generic status updater (eliminates Radarr/Sonarr duplication)
 */
async function updateMediaStatusByField(
  db: DB,
  field: 'radarrId' | 'sonarrId',
  id: number,
  status: MediaStatus
): Promise<void> {
  await db.update(media).set({ status, updatedAt: Date.now() }).where(eq(media[field], id));
}

/**
 * Batch update media status by radarr/sonarr IDs
 */
export async function batchUpdateMediaStatus(
  db: DB,
  updates: Array<{
    radarrId?: number;
    sonarrId?: number;
    status: MediaStatus;
  }>
): Promise<void> {
  for (const { radarrId, sonarrId, status } of updates) {
    if (radarrId) {
      await updateMediaStatusByField(db, 'radarrId', radarrId, status);
    } else if (sonarrId) {
      await updateMediaStatusByField(db, 'sonarrId', sonarrId, status);
    }
  }
}

/**
 * Get all media with radarr/sonarr IDs for sync matching
 */
export async function getMediaWithArrIds(
  db: DB
): Promise<Array<Omit<DbMedia, 'createdAt' | 'updatedAt'>>> {
  return db
    .select({
      id: media.id,
      type: media.type,
      tmdbId: media.tmdbId,
      tvdbId: media.tvdbId,
      radarrId: media.radarrId,
      sonarrId: media.sonarrId,
      jellyfinId: media.jellyfinId,
      status: media.status,
    })
    .from(media)
    .where(inArray(media.type, ['movie', 'tv']));
}

/**
 * Generic clear removed items (eliminates Radarr/Sonarr duplication)
 */
async function clearRemovedItems(
  db: DB,
  ids: number[],
  field: 'radarrId' | 'sonarrId',
  type: 'movie' | 'tv'
): Promise<number> {
  if (ids.length === 0) return 0;

  let cleared = 0;

  for (const id of ids) {
    const current = (await db.query.media.findFirst({
      where: and(eq(media[field], id), eq(media.type, type)),
      columns: { id: true, status: true },
    })) as Pick<DbMedia, 'id' | 'status'> | undefined;

    if (!current) continue;

    const newStatus: MediaStatus = current.status === 'available' ? 'available' : 'pending';

    await db
      .update(media)
      .set({
        [field]: null,
        status: newStatus,
        updatedAt: Date.now(),
      })
      .where(eq(media.id, current.id));

    cleared++;
  }

  return cleared;
}

/**
 * Clear Radarr-removed movies
 */
export const clearRemovedRadarrItems = (db: DB, ids: number[]) =>
  clearRemovedItems(db, ids, 'radarrId', 'movie');

/**
 * Clear Sonarr-removed series
 */
export const clearRemovedSonarrItems = (db: DB, ids: number[]) =>
  clearRemovedItems(db, ids, 'sonarrId', 'tv');
