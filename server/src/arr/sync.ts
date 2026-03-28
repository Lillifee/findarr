import { isDefined, type MediaStatus } from '@findarr/shared';
import type { FastifyInstance } from 'fastify';
import { HttpError } from '../utils/errors.js';
import {
  upsertMediaFromArr,
  getMediaWithArrIds,
  batchUpdateMediaStatus,
  clearRemovedArrItems,
  getExistingTvdbIds,
} from './repository.js';
import type { ArrLibraryItem } from './schemas.js';
import type { AnyArrService } from './service.js';

const CONCURRENCY = 8;
const MAX_RETRIES = 2;
const BASE_DELAY = 500; // ms

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function backoffDelay(attempt: number) {
  // Exponential backoff + jitter
  const jitter = Math.random() * 300;
  return BASE_DELAY * Math.pow(2, attempt) + jitter;
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
  let queueIndex = 0;

  async function fetchTmdbId(tvdbId: number, attempt = 0): Promise<number | null> {
    try {
      const tmdbId = await fastify.tmdb.findByExternalId({
        tvdbId,
        type: 'tv',
      });

      return tmdbId !== undefined && tmdbId > 0 ? tmdbId : null;
    } catch (error: unknown) {
      if (error instanceof HttpError && error.statusCode === 404) {
        // Not found in TMDB → return null (will not be inserted)
        return null;
      }

      if (error instanceof HttpError && error.statusCode === 429 && attempt < MAX_RETRIES) {
        const delay = backoffDelay(attempt);
        await sleep(delay);
        return fetchTmdbId(tvdbId, attempt + 1);
      }

      throw error;
    }
  }

  const worker = async () => {
    let localCount = 0;

    while (true) {
      const index = queueIndex++;
      if (index >= queue.length) break;

      const item = queue[index];
      if (!item?.tvdbId) continue;

      try {
        const tmdbId = await fetchTmdbId(item.tvdbId);

        if (tmdbId) {
          item.tmdbId = tmdbId;
          localCount++;
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        log.warn({ tvdbId: item.tvdbId, error: message }, 'Enrichment failed');
      }

      // Progress logging (lightweight)
      if ((index + 1) % 50 === 0 || index + 1 === queue.length) {
        log.info(`Enrichment progress: ${index + 1}/${queue.length}`);
      }
    }

    return localCount;
  };

  // Start workers
  const results = await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  // Aggregate counts safely
  const enrichedCount = results.reduce((sum, val) => sum + val, 0);

  log.info(`Enrichment complete: ${enrichedCount}/${queue.length}`);

  return enrichedCount;
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
    // Get tvdbIds of shows already in database (prevents re-enrichment)
    const alreadyProcessed = await getExistingTvdbIds(db);

    // Only enrich NEW shows not yet in database
    const queue = libraryItems.filter(item => item?.tvdbId && !alreadyProcessed.has(item.tvdbId));

    if (queue.length > 0) {
      log.info(`Enriching ${queue.length} new TV shows with TMDB IDs...`);
      await enrichTvShows(fastify, queue);
    } else {
      log.debug('No new TV shows to enrich');
    }
  }

  // Map library items to upsert format
  const itemsToUpsert = libraryItems.map(item => ({
    type: mediaType,
    arrId: item.id,
    tvdbId: item.tvdbId ?? null,
    tmdbId: item.tmdbId ?? null,
    status: (item.hasFile ? 'downloaded' : 'requested') as MediaStatus,
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
  const existingMedia = await getMediaWithArrIds(db);
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
  const statusUpdates: Array<{ arrId: number; status: MediaStatus }> = [];
  const currentDownloadingIds = new Set<number>();

  // Get queue from service
  const queue = await arrService.getQueue();

  // Process queue items
  for (const item of queue.records) {
    if (item.arrId) {
      if (item.trackedDownloadStatus === 'warning') {
        // Mark as warning - don't count as active download
        statusUpdates.push({ arrId: item.arrId, status: 'warning' });
        fastify.log.warn(
          { arrId: item.arrId, status: item.trackedDownloadStatus },
          'Download requires manual intervention'
        );
      } else {
        // Normal downloading state
        currentDownloadingIds.add(item.arrId);
        statusUpdates.push({ arrId: item.arrId, status: 'downloading' });
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
