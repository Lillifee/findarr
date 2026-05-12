import { isDefined, type MediaStatus, type MediaType } from '@findarr/shared';
import type { FastifyInstance } from 'fastify';
import { processWithWorkerPool } from '../tmdb/helpers.js';
import {
  upsertMediaFromArr,
  getMediaWithArrIds,
  batchUpdateMediaStatus,
  clearRemovedArrItems,
  getExistingTvdbIds,
} from './repository.js';
import type { ArrLibraryItem } from './schemas.js';
import type { AnyArrService } from './service.js';

/**
 * Generic complete sync for Radarr or Sonarr
 * Library sync with inline enrichment for TV shows
 */
export async function syncComplete(
  fastify: FastifyInstance,
  arrService: AnyArrService
): Promise<void> {
  fastify.log.info(`Starting ${arrService.config.service} library sync...`);
  const startTime = Date.now();
  const { log } = fastify;

  // Check if service is configured
  const isConfigured = await arrService.isConfigured();

  if (!isConfigured) {
    log.debug(`${arrService.config.service} not configured - skipping sync`);
    return;
  }

  // Test connection
  const isConnected = await arrService.testConnection();

  if (!isConnected) {
    throw new Error(`${arrService.config.service} connection test failed`);
  }

  log.debug(`${arrService.config.service} connection successful`);

  // Library sync with inline enrichment for TV shows
  await syncLibrary(fastify, arrService);

  const durationMs = Date.now() - startTime;
  const durationSec = Math.round(durationMs / 1000);

  fastify.log.info(
    { durationSec },
    `${arrService.config.service} library sync finished successfully`
  );
}

/**
 * Generic library sync for Radarr or Sonarr
 * Fetches all items from the service and updates database
 */
export async function syncLibrary(
  fastify: FastifyInstance,
  arrService: AnyArrService
): Promise<void> {
  const { db, log } = fastify;
  const { config } = arrService;
  const { mediaType, service } = config;

  // Fetch library items (already transformed to ArrLibraryItem)
  const libraryItems = await arrService.getLibrary();

  if (libraryItems.length === 0) {
    log.info(`No ${service} items found`);
    return;
  }

  log.info(`Fetched ${libraryItems.length} items from ${service}`);

  // For TV shows: Enrich with tmdbId during sync to avoid duplicate records
  // This prevents conflicts when Jellyfin already has the same show with tmdbId
  if (mediaType === 'tv') {
    const alreadyProcessed = await getExistingTvdbIds(db);
    const queue = libraryItems.filter(item => item?.tvdbId && !alreadyProcessed.has(item.tvdbId));

    if (queue.length > 0) {
      await enrichTvShows(fastify, queue);
    }
  }

  // Map library items to upsert format
  const itemsToUpsert = libraryItems.map(item => ({
    type: mediaType,
    arrId: item.id,
    arrUrl: item.arrUrl ?? null,
    tvdbId: item.tvdbId ?? null,
    tmdbId: item.tmdbId ?? null,
    status: (item.hasFile ? 'downloaded' : 'requested') as MediaStatus,
    seasons: item.seasons ?? null,
  }));

  // Count items that will be skipped due to missing IDs
  const itemsWithRequiredIds =
    mediaType === 'tv'
      ? itemsToUpsert.filter(item => item.tvdbId !== null)
      : itemsToUpsert.filter(item => item.tmdbId !== null);

  const skippedCount = itemsToUpsert.length - itemsWithRequiredIds.length;
  if (skippedCount > 0) {
    log.warn(
      { skippedCount, mediaType },
      `Skipping ${skippedCount} ${service} items missing required external ID`
    );
  }
  await upsertMediaFromArr(db, itemsToUpsert);

  // Cleanup: Find items in DB that are no longer in Radarr/Sonarr
  const existingMedia = await getMediaWithArrIds(db, mediaType);
  const currentArrIds = new Set(libraryItems.map(item => item.id));
  const removedArrIds = existingMedia
    .map(m => m.arrId)
    .filter(arrId => isDefined(arrId))
    .filter(arrId => !currentArrIds.has(arrId));

  if (removedArrIds.length > 0) {
    const clearedCount = await clearRemovedArrItems(db, removedArrIds, mediaType);
    log.info(`Cleaned up ${clearedCount} removed from ${service} (reset to pending)`);
  }

  log.info(`${service} library synced ${libraryItems.length} items`);
}

/**
 * Enrich TV shows with TMDB IDs using worker pool pattern
 * Provides smooth, continuous processing with exponential backoff retry logic
 */
export async function enrichTvShows(
  fastify: FastifyInstance,
  queue: ArrLibraryItem[]
): Promise<number> {
  const { log } = fastify;

  log.info(`Enriching ${queue.length} new TV shows with TMDB IDs...`);

  const { successCount } = await processWithWorkerPool({
    items: queue,
    processFn: async item => {
      if (!item?.tvdbId) return null;

      const tmdbId = await fastify.tmdb.findByExternalId({ tvdbId: item.tvdbId, type: 'tv' });

      if (tmdbId) item.tmdbId = tmdbId;
      return tmdbId || null;
    },
    log,
  });

  log.info(`Enrichment complete: ${successCount}/${queue.length}`);

  return successCount;
}

/**
 * Generic queue sync for Radarr or Sonarr
 * Updates media status for items in the download queue
 * Returns current state for completion detection
 */
export async function syncQueue(
  fastify: FastifyInstance,
  arrService: AnyArrService,
  previousDownloadingIds: Set<number>
): Promise<{
  currentDownloadingIds: Set<number>;
  completedIds: number[];
  hasActiveDownloads: boolean;
}> {
  const statusUpdates: Array<{ arrId: number; type: MediaType; status: MediaStatus }> = [];
  const currentDownloadingIds = new Set<number>();
  const mediaType = arrService.config.mediaType;

  // Get queue from service
  const queue = await arrService.getQueue();

  // Process queue items
  for (const item of queue.records) {
    if (item.arrId) {
      if (item.trackedDownloadStatus === 'warning') {
        // Mark as warning - don't count as active download
        statusUpdates.push({ arrId: item.arrId, type: mediaType, status: 'warning' });
        fastify.log.warn(
          { arrId: item.arrId, status: item.trackedDownloadStatus },
          'Download requires manual intervention'
        );
      } else {
        // Normal downloading state
        currentDownloadingIds.add(item.arrId);
        statusUpdates.push({ arrId: item.arrId, type: mediaType, status: 'downloading' });
      }
    }
  }

  // Update statuses for items IN queue
  if (statusUpdates.length > 0) {
    await batchUpdateMediaStatus(fastify.db, statusUpdates);
  }

  // Detect completions by comparing previous vs current downloading IDs
  const completedIds = [...previousDownloadingIds].filter(id => !currentDownloadingIds.has(id));

  return {
    currentDownloadingIds,
    completedIds,
    hasActiveDownloads: currentDownloadingIds.size > 0,
  };
}
