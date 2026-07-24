import { media, type DbMedia } from '@findarr/shared/db';
import type { MediaStatus, MediaType } from '@findarr/shared/media';
import type { ArrSettingsQuery } from '@findarr/shared/settings';
import { isDefined } from '@findarr/shared/utils';
import { and, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';

import type { Database } from '../db/service.js';
import type { SettingsService } from '../settings/service.js';
import type { ArrServiceConfig, ArrServiceType } from './config.js';
import type { ArrSettingsFull } from './types.js';

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
  },
): Promise<void> {
  const updateData: Record<string, unknown> = { ...ids, updatedAt: Date.now() };

  // Filter out undefined values
  const filteredData = Object.fromEntries(
    Object.entries(updateData).filter(([, value]) => isDefined(value)),
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
  db: Database,
): Promise<Pick<DbMedia, 'id' | 'tvdbId' | 'type'>[]> {
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

  return new Set(results.map((r) => r.tvdbId).filter((x) => isDefined(x)));
}

export type UpsertArrMedia = Pick<
  DbMedia,
  'type' | 'tvdbId' | 'tmdbId' | 'arrId' | 'arrUrl' | 'status' | 'seasons'
>;

/**
 * Upsert media from Radarr/Sonarr sync (batched for performance)
 * Movies: Use tmdbId constraint
 * TV shows: Use tmdbId constraint if available (enriched), otherwise tvdbId
 */
export async function upsertMediaFromArr(db: Database, items: UpsertArrMedia[]): Promise<void> {
  if (items.length === 0) {
    return;
  }

  const now = Date.now();

  // Items with valid tmdbId (> 0) - use tmdbId constraint
  // This merges Sonarr + Jellyfin records when they share the same tmdbId
  const itemsWithTmdbId = items.filter((item) => isDefined(item.tmdbId) && item.tmdbId > 0);
  if (itemsWithTmdbId.length > 0) {
    await db
      .insert(media)
      .values(
        itemsWithTmdbId.map((item) => ({
          ...item,
          createdAt: now,
          updatedAt: now,
        })),
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
    (item) =>
      item.type === 'tv' && (!isDefined(item.tmdbId) || item.tmdbId <= 0) && isDefined(item.tvdbId),
  );
  if (tvItemsWithoutValidTmdbId.length > 0) {
    await db
      .insert(media)
      .values(
        tvItemsWithoutValidTmdbId.map((item) => ({
          ...item,
          createdAt: now,
          updatedAt: now,
        })),
      )
      .onConflictDoUpdate({
        target: [media.tvdbId, media.type],
        set: {
          arrId: sql`excluded.arrId`,
          arrUrl: sql`excluded.arrUrl`,
          tmdbId: sql`COALESCE(media.tmdbId, excluded.tmdbId)`,
          seasons: sql`excluded.seasons`,
          status: sql`CASE WHEN media.status = 'available' THEN 'available' ELSE excluded.status END`,
          updatedAt: now,
        },
      });
  }
}

/**
 * Batch update media status by arr IDs
 */
export async function batchUpdateMediaStatuses(
  db: Database,
  updates: {
    arrId: number;
    type: MediaType;
    status: MediaStatus;
  }[],
): Promise<void> {
  // One transaction for the whole batch → a single commit instead of one per row.
  db.transaction((tx) => {
    for (const { arrId, type, status } of updates) {
      tx.update(media)
        .set({ status, updatedAt: Date.now() })
        .where(and(eq(media.arrId, arrId), eq(media.type, type)))
        .run();
    }
  });
}

/**
 * Get all media with arr IDs for sync matching
 */
export async function listMediaWithArrIds(db: Database, type: MediaType): Promise<number[]> {
  const results = await db
    .select({ arrId: media.arrId })
    .from(media)
    .where(and(eq(media.type, type), isNotNull(media.arrId)));

  return results.map((r) => r.arrId).filter((id) => isDefined(id));
}

/**
 * Clear removed items from Radarr/Sonarr
 */
export async function clearRemovedArrItems(
  db: Database,
  ids: number[],
  type: MediaType,
): Promise<number> {
  if (ids.length === 0) {
    return 0;
  }

  const result = await db
    .update(media)
    .set({
      arrId: null,
      arrUrl: null,
      status: sql`CASE WHEN ${media.status} = 'available' THEN 'available' ELSE 'none' END`,
      updatedAt: Date.now(),
    })
    .where(and(inArray(media.arrId, ids), eq(media.type, type)));

  return result.changes;
}

function createArrSettingsFieldMap(service: ArrServiceType) {
  return {
    url: `${service}Url`,
    apiKey: `${service}ApiKey`,
    qualityProfileId: `${service}QualityProfileId`,
    rootFolderPath: `${service}RootFolderPath`,
    enabled: `${service}Enabled`,
  };
}

export async function getArrSettings(
  settings: SettingsService,
  config: ArrServiceConfig,
): Promise<ArrSettingsFull> {
  const fields = createArrSettingsFieldMap(config.service);
  const storedSettings = await settings.getAll();
  const qualityProfileIdValue = storedSettings[fields.qualityProfileId];

  return {
    url: storedSettings[fields.url] ?? null,
    apiKey: storedSettings[fields.apiKey] ?? null,
    apiKeySet: isDefined(storedSettings[fields.apiKey]),
    qualityProfileId: isDefined(qualityProfileIdValue)
      ? Math.trunc(Number(qualityProfileIdValue))
      : null,
    rootFolderPath: storedSettings[fields.rootFolderPath] ?? null,
    enabled: isDefined(storedSettings[fields.enabled])
      ? storedSettings[fields.enabled] === 'true'
      : isDefined(storedSettings[fields.url]),
  };
}

export async function setArrSettings(
  settings: SettingsService,
  config: ArrServiceConfig,
  arrSettings: ArrSettingsQuery,
): Promise<void> {
  const fields = createArrSettingsFieldMap(config.service);

  await settings.set({
    [fields.url]: arrSettings.url,
    [fields.apiKey]: arrSettings.apiKey,
    [fields.qualityProfileId]: arrSettings.qualityProfileId?.toString(),
    [fields.rootFolderPath]: arrSettings.rootFolderPath,
    [fields.enabled]: arrSettings.enabled?.toString(),
  });
}
