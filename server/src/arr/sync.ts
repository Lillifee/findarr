import { isDefined, type MediaStatus, type MediaType } from '@findarr/shared';
import type { FastifyInstance } from 'fastify';
import { processWithWorkerPool } from '../tmdb/helpers.js';
import {
  upsertMediaFromArr,
  listMediaWithArrIds,
  batchUpdateMediaStatuses,
  clearRemovedArrItems,
  getExistingTvdbIdSet,
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
  // Check if service is configured
  const isConfigured = await arrService.isConfigured();

  if (!isConfigured) {
    fastify.log.debug(
      { name: arrService.config.service, service: arrService.config.service },
      'Not configured - skipping sync'
    );
    return;
  }

  fastify.log.info(
    { name: arrService.config.service, service: arrService.config.service },
    'Starting library sync'
  );
  const startTime = Date.now();
  const { log } = fastify;

  // Test connection
  const isConnected = await arrService.testConnection();

  if (!isConnected) {
    throw new Error(`${arrService.config.service} connection test failed`);
  }

  log.debug(
    { name: arrService.config.service, service: arrService.config.service },
    'Connection successful'
  );

  // Library sync with inline enrichment for TV shows
  await syncLibrary(fastify, arrService);

  const durationMs = Date.now() - startTime;
  const durationSec = Math.round(durationMs / 1000);

  fastify.log.info(
    { name: arrService.config.service, service: arrService.config.service, durationSec },
    'Library sync finished successfully'
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
  const libraryItems = await arrService.listLibraryItems();

  if (libraryItems.length === 0) {
    log.info({ name: service, service }, 'No items found');
    return;
  }

  log.info({ name: service, service, totalItems: libraryItems.length }, 'Fetched items');

  // For TV shows: Enrich with tmdbId during sync to avoid duplicate records
  // This prevents conflicts when Jellyfin already has the same show with tmdbId
  if (mediaType === 'tv') {
    const existingTvdbIdSet = await getExistingTvdbIdSet(db);
    const queue = libraryItems.filter(item => item?.tvdbId && !existingTvdbIdSet.has(item.tvdbId));

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
      { name: service, service, skippedCount, mediaType },
      'Skipping items missing required external ID'
    );
  }
  await upsertMediaFromArr(db, itemsToUpsert);

  // Cleanup: Find items in DB that are no longer in Radarr/Sonarr
  const existingMedia = await listMediaWithArrIds(db, mediaType);
  const currentArrIds = new Set(libraryItems.map(item => item.id));
  const removedArrIds = existingMedia
    .map(m => m.arrId)
    .filter(arrId => isDefined(arrId))
    .filter(arrId => !currentArrIds.has(arrId));

  if (removedArrIds.length > 0) {
    const clearedCount = await clearRemovedArrItems(db, removedArrIds, mediaType);
    log.info(
      { name: service, service, clearedCount },
      'Cleaned up removed items (reset to pending)'
    );
  }

  log.info({ name: service, service, totalItems: libraryItems.length }, 'Library synced');
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

  log.info(
    { name: 'sonarr', service: 'sonarr', totalItems: queue.length },
    'Enriching new TV shows with TMDB IDs'
  );

  const { successCount } = await processWithWorkerPool({
    items: queue,
    processFn: async item => {
      if (!item?.tvdbId) return null;

      const tmdbId = await fastify.tmdb.findByExternalId('tv', item.tvdbId);

      if (tmdbId) item.tmdbId = tmdbId;
      return tmdbId || null;
    },
    log,
  });

  log.info(
    { name: 'sonarr', service: 'sonarr', successCount, totalItems: queue.length },
    'Enrichment complete'
  );

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
          {
            name: arrService.config.service,
            service: arrService.config.service,
            arrId: item.arrId,
            status: item.trackedDownloadStatus,
          },
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
    await batchUpdateMediaStatuses(fastify.db, statusUpdates);
  }

  // Detect completions by comparing previous vs current downloading IDs
  const completedIds = [...previousDownloadingIds].filter(id => !currentDownloadingIds.has(id));

  return {
    currentDownloadingIds,
    completedIds,
    hasActiveDownloads: currentDownloadingIds.size > 0,
  };
}
