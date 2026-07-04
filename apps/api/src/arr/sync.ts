import type { MediaStatus, MediaType } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';

import type { SchedulerContext } from '../scheduler/types.js';
import { processWithWorkerPool } from '../tmdb/helpers.js';
import {
  upsertMediaFromArr,
  listMediaWithArrIds,
  batchUpdateMediaStatuses,
  clearRemovedArrItems,
  getExistingTvdbIdSet,
  type UpsertArrMedia,
} from './repository.js';
import type { ArrLibraryItem } from './schemas.js';
import type { AnyArrService } from './service.js';

/**
 * Enrich TV shows with TMDB IDs using worker pool pattern
 * Provides smooth, continuous processing with exponential backoff retry logic
 */
export async function enrichTvShows(
  context: SchedulerContext,
  queue: ArrLibraryItem[],
): Promise<number> {
  const { appLog } = context;
  const log = appLog.scope('sonarr');

  log.info({ totalItems: queue.length }, 'Enriching new TV shows with TMDB IDs');

  const { successCount } = await processWithWorkerPool({
    items: queue,
    processFn: async (item) => {
      if (!isDefined(item.tvdbId)) {
        return null;
      }

      const tmdbId = await context.tmdb.findByExternalId('tv', item.tvdbId);
      if (isDefined(tmdbId)) {
        item.tmdbId = tmdbId;
      }

      return tmdbId ?? null;
    },
    appLog: log,
  });

  log.info({ successCount, totalItems: queue.length }, 'Enrichment complete');

  return successCount;
}

/**
 * Generic library sync for Radarr or Sonarr
 * Fetches all items from the service and updates database
 */
export async function syncLibrary(
  context: SchedulerContext,
  arrService: AnyArrService,
): Promise<void> {
  const { db, appLog } = context;
  const { config } = arrService;
  const { mediaType, service } = config;
  const log = appLog.scope(service);

  // Fetch library items (already transformed to ArrLibraryItem)
  const libraryItems = await arrService.listLibraryItems();

  if (libraryItems.length === 0) {
    log.info('No items found');
    return;
  }

  log.info({ totalItems: libraryItems.length }, 'Fetched items');

  // For TV shows: Enrich with tmdbId during sync to avoid duplicate records
  // This prevents conflicts when Jellyfin already has the same show with tmdbId
  if (mediaType === 'tv') {
    const existingTvdbIdSet = await getExistingTvdbIdSet(db);
    const queue = libraryItems.filter(
      (item) => isDefined(item.tvdbId) && !existingTvdbIdSet.has(item.tvdbId),
    );

    if (queue.length > 0) {
      await enrichTvShows(context, queue);
    }
  }

  // Map library items to upsert format
  const itemsToUpsert: UpsertArrMedia[] = libraryItems.map((item) => ({
    type: mediaType,
    arrId: item.id,
    arrUrl: item.arrUrl ?? null,
    tvdbId: item.tvdbId ?? null,
    tmdbId: item.tmdbId ?? null,
    status: item.hasFile ? 'downloaded' : 'requested',
    seasons: item.seasons ?? null,
  }));

  // Count items that will be skipped due to missing IDs
  const itemsWithRequiredIds =
    mediaType === 'tv'
      ? itemsToUpsert.filter((item) => isDefined(item.tvdbId))
      : itemsToUpsert.filter((item) => isDefined(item.tmdbId));

  const skippedCount = itemsToUpsert.length - itemsWithRequiredIds.length;
  if (skippedCount > 0) {
    log.warn({ skippedCount, mediaType }, 'Skipping items missing required external ID');
  }
  await upsertMediaFromArr(db, itemsToUpsert);

  // Cleanup: Find items in DB that are no longer in Radarr/Sonarr
  const existingArrIds = await listMediaWithArrIds(db, mediaType);
  const currentArrIds = new Set(libraryItems.map((item) => item.id));
  const removedArrIds = existingArrIds.filter((arrId) => !currentArrIds.has(arrId));

  if (removedArrIds.length > 0) {
    const clearedCount = await clearRemovedArrItems(db, removedArrIds, mediaType);
    log.info({ clearedCount }, 'Cleaned up removed items (reset to pending)');
  }

  log.info({ totalItems: libraryItems.length }, 'Library synced');
}

/**
 * Generic queue sync for Radarr or Sonarr
 * Updates media status for items in the download queue
 * Returns current state for completion detection
 */
export async function syncQueue(
  context: SchedulerContext,
  arrService: AnyArrService,
  previousDownloadingIds: Set<number>,
): Promise<{
  currentDownloadingIds: Set<number>;
  completedIds: number[];
  hasActiveDownloads: boolean;
}> {
  const statusUpdates: { arrId: number; type: MediaType; status: MediaStatus }[] = [];
  const currentDownloadingIds = new Set<number>();
  const { mediaType, service } = arrService.config;
  const log = context.appLog.scope(service);

  // Get queue from service
  const queueItems = await arrService.getQueue(1000);
  const statusMap = new Map<number, MediaStatus>();

  for (const item of queueItems) {
    if (!isDefined(item.arrId)) {
      continue;
    }

    if (item.trackedDownloadStatus === 'warning') {
      statusMap.set(item.arrId, 'warning');
      log.warn(
        { arrId: item.arrId, status: item.trackedDownloadStatus },
        'Download requires manual intervention',
      );
    } else {
      statusMap.set(item.arrId, 'downloading');
    }
  }

  statusUpdates.push(
    ...Array.from(statusMap, ([arrId, status]) => ({ arrId, type: mediaType, status })),
  );

  // Update statuses for items IN queue
  if (statusUpdates.length > 0) {
    await batchUpdateMediaStatuses(context.db, statusUpdates);
  }

  // Detect completions by comparing previous vs current downloading IDs
  const completedIds = [...previousDownloadingIds].filter((id) => !statusMap.has(id));

  return {
    currentDownloadingIds,
    completedIds,
    hasActiveDownloads: currentDownloadingIds.size > 0,
  };
}
