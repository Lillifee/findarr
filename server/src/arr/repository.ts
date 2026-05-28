import type {
  ArrSettings,
  ArrSettingsQuery,
  DbMedia,
  MediaStatus,
  MediaType,
} from '@findarr/shared';
import { isDefined, media } from '@findarr/shared';
import { and, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import type { Database } from '../db/service.js';
import { readSettings, writeSettings } from '../settings/repository.js';
import type { ArrServiceConfig, ArrServiceType } from './config.js';

/**
 * Update media record with IDs from Radarr/Sonarr
 */
export async function updateMediaIds(
  db: Database,
  mediaId: number,
  ids: {
    tmdbId?: number | undefined;
    tvdbId?: number | undefined;
    arrId?: number | undefined;
    arrUrl?: string | undefined;
  }
): Promise<void> {
  const updateData: Record<string, unknown> = { ...ids, updatedAt: Date.now() };

  // Filter out undefined values
  const filteredData = Object.fromEntries(
    Object.entries(updateData).filter(([, value]) => isDefined(value))
  );

  // Only update if we actually have fields besides updatedAt
  if (Object.keys(filteredData).length > 1) {
    await db.update(media).set(filteredData).where(eq(media.id, mediaId));
  }
}

/**
 * Get all TV shows without TMDB ID for enrichment (from Sonarr)
 * These shows have tvdbId but need TMDB ID for display/search
 */
export async function getMediaWithoutTmdbId(
  db: Database
): Promise<Array<Pick<DbMedia, 'id' | 'tvdbId' | 'type'>>> {
  return db
    .select({
      id: media.id,
      tvdbId: media.tvdbId,
      type: media.type,
    })
    .from(media)
    .where(and(eq(media.type, 'tv'), isNull(media.tmdbId)));
}

/**
 * Get all existing tvdbIds for TV shows in database
 * Used to skip re-enrichment of shows already processed
 */
export async function getExistingTvdbIdSet(db: Database): Promise<Set<number>> {
  const results = await db
    .select({ tvdbId: media.tvdbId })
    .from(media)
    .where(and(eq(media.type, 'tv'), isNotNull(media.tvdbId)));

  return new Set(results.map(r => r.tvdbId).filter(x => isDefined(x)));
}

/**
 * Upsert media from Radarr/Sonarr sync (batched for performance)
 * Movies: Use tmdbId constraint
 * TV shows: Use tmdbId constraint if available (enriched), otherwise tvdbId
 */
export async function upsertMediaFromArr(
  db: Database,
  items: Array<
    Pick<
      DbMedia,
      'type' | 'tvdbId' | 'tmdbId' | 'arrId' | 'arrUrl' | 'status' | 'seasons'
    >
  >
): Promise<void> {
  if (items.length === 0) return;

  const now = Date.now();

  // Items with valid tmdbId (> 0) - use tmdbId constraint
  // This merges Sonarr + Jellyfin records when they share the same tmdbId
  const itemsWithTmdbId = items.filter(item => item.tmdbId && item.tmdbId > 0);
  if (itemsWithTmdbId.length > 0) {
    await db
      .insert(media)
      .values(
        itemsWithTmdbId.map(item => ({
          ...item,
          createdAt: now,
          updatedAt: now,
        }))
      )
      .onConflictDoUpdate({
        target: [media.tmdbId, media.type],
        set: {
          arrId: sql`excluded.arrId`,
          arrUrl: sql`excluded.arrUrl`,
          tvdbId: sql`COALESCE(media.tvdbId, excluded.tvdbId)`,
          seasons: sql`excluded.seasons`,
          status: sql`CASE WHEN media.status = 'available' THEN 'available' ELSE excluded.status END`,
          updatedAt: now,
        },
      });
  }

  // TV shows without valid tmdbId (null, undefined, or -1) - use tvdbId constraint
  // These are shows enrichment failed for or shows without tvdbId from Sonarr
  const tvItemsWithoutValidTmdbId = items.filter(
    item =>
      item.type === 'tv' && (!item.tmdbId || item.tmdbId <= 0) && item.tvdbId
  );
  if (tvItemsWithoutValidTmdbId.length > 0) {
    await db
      .insert(media)
      .values(
        tvItemsWithoutValidTmdbId.map(item => ({
          ...item,
          createdAt: now,
          updatedAt: now,
        }))
      )
      .onConflictDoUpdate({
        target: [media.tvdbId, media.type],
        set: {
          arrId: sql`excluded.arrId`,
          arrUrl: sql`excluded.arrUrl`,
          tmdbId: sql`COALESCE(media.tmdbId, excluded.tmdbId)`, // Preserve -1 if already set
          seasons: sql`excluded.seasons`,
          status: sql`CASE WHEN media.status = 'available' THEN 'available' ELSE excluded.status END`,
          updatedAt: now,
        },
      });
  }
}

/**
 * Update media status by arrId
 */
export async function updateMediaStatusByArrId(
  db: Database,
  arrId: number,
  type: MediaType,
  status: MediaStatus
): Promise<void> {
  await db
    .update(media)
    .set({ status, updatedAt: Date.now() })
    .where(and(eq(media.arrId, arrId), eq(media.type, type)));
}

/**
 * Batch update media status by arr IDs
 */
export async function batchUpdateMediaStatuses(
  db: Database,
  updates: Array<{
    arrId: number;
    type: MediaType;
    status: MediaStatus;
  }>
): Promise<void> {
  for (const { arrId, type, status } of updates) {
    await updateMediaStatusByArrId(db, arrId, type, status);
  }
}

/**
 * Get all media with arr IDs for sync matching
 */
export async function listMediaWithArrIds(
  db: Database,
  type: MediaType
): Promise<Array<Omit<DbMedia, 'createdAt' | 'updatedAt'>>> {
  return db
    .select({
      id: media.id,
      type: media.type,
      tvdbId: media.tvdbId,
      tmdbId: media.tmdbId,
      arrId: media.arrId,
      arrUrl: media.arrUrl,
      jellyfinId: media.jellyfinId,
      jellyfinAddedAt: media.jellyfinAddedAt,
      seasons: media.seasons,
      status: media.status,
    })
    .from(media)
    .where(eq(media.type, type));
}

/**
 * Clear removed items from Radarr/Sonarr
 */
export async function clearRemovedArrItems(
  db: Database,
  ids: number[],
  type: MediaType
): Promise<number> {
  if (ids.length === 0) return 0;

  let cleared = 0;

  for (const arrId of ids) {
    const currentMediaRecord = (await db.query.media.findFirst({
      where: and(eq(media.arrId, arrId), eq(media.type, type)),
      columns: { id: true, status: true },
    })) as Pick<DbMedia, 'id' | 'status'> | undefined;

    if (!currentMediaRecord) continue;

    const newStatus: MediaStatus =
      currentMediaRecord.status === 'available' ? 'available' : 'pending';

    await db
      .update(media)
      .set({
        arrId: null,
        arrUrl: null,
        status: newStatus,
        updatedAt: Date.now(),
      })
      .where(eq(media.id, currentMediaRecord.id));

    cleared++;
  }

  return cleared;
}

export interface ArrSettingsFull extends ArrSettings {
  apiKey: string | null;
}

function createArrSettingsFieldMap(service: ArrServiceType) {
  return {
    url: `${service}Url`,
    apiKey: `${service}ApiKey`,
    qualityProfileId: `${service}QualityProfileId`,
    rootFolderPath: `${service}RootFolderPath`,
  };
}
export async function getArrSettings(
  db: Database,
  config: ArrServiceConfig
): Promise<ArrSettingsFull> {
  const fields = createArrSettingsFieldMap(config.service);
  const storedSettings = await readSettings(db, Object.values(fields));
  const qualityProfileIdValue = storedSettings[fields.qualityProfileId];

  return {
    url: storedSettings[fields.url] ?? null,
    apiKey: storedSettings[fields.apiKey] ?? null,
    apiKeySet: !!storedSettings[fields.apiKey],
    qualityProfileId: qualityProfileIdValue
      ? Number.parseInt(qualityProfileIdValue, 10)
      : null,
    rootFolderPath: storedSettings[fields.rootFolderPath] ?? null,
  };
}

export async function setArrSettings(
  db: Database,
  config: ArrServiceConfig,
  settings: {
    url?: ArrSettingsQuery['url'] | undefined;
    apiKey?: ArrSettingsQuery['apiKey'] | undefined;
    qualityProfileId?: ArrSettingsQuery['qualityProfileId'] | undefined;
    rootFolderPath?: ArrSettingsQuery['rootFolderPath'] | undefined;
  }
): Promise<void> {
  const fields = createArrSettingsFieldMap(config.service);

  await writeSettings(db, {
    [fields.url]: settings.url,
    [fields.apiKey]: settings.apiKey,
    [fields.qualityProfileId]: settings.qualityProfileId?.toString(),
    [fields.rootFolderPath]: settings.rootFolderPath,
  } as Record<string, string | undefined>);
}
