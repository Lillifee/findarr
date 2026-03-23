import type { MediaStatus } from '@findarr/shared';
import type { FastifyInstance } from 'fastify';
import {
  upsertMediaFromArr,
  updateMediaExternalIds,
  getMediaWithoutTvdbId,
  batchUpdateMediaStatus,
  getMediaWithArrIds,
  clearRemovedRadarrItems,
  clearRemovedSonarrItems,
} from './repository.js';
import type { RadarrMovie, SonarrSeries } from './schemas.js';

/**
 * Sync media library from Radarr and Sonarr
 * Phase 1: Quick sync - stores/updates media records with Radarr/Sonarr IDs
 * TVDB IDs are enriched separately by enrichTvdbIds()
 */
export async function syncArrLibrary(fastify: FastifyInstance): Promise<void> {
  const startTime = Date.now();
  fastify.log.info('Starting Radarr/Sonarr library sync (phase 1)...');

  try {
    let radarrCount = 0;
    let sonarrCount = 0;

    // Fetch existing media once for both Radarr and Sonarr sync
    const existingMedia = await getMediaWithArrIds(fastify.db);

    // Fetch all movies from Radarr (returns empty array if not configured)
    const radarrMovies = await fastify.arr.getRadarrMovies();
    if (radarrMovies.length > 0) {
      fastify.log.info(`Fetched ${radarrMovies.length} movies from Radarr`);
      await syncRadarrMovies(fastify, radarrMovies, existingMedia);
      radarrCount = radarrMovies.length;
    }

    // Fetch all series from Sonarr (returns empty array if not configured)
    const sonarrSeries = await fastify.arr.getSonarrSeries();
    if (sonarrSeries.length > 0) {
      fastify.log.info(`Fetched ${sonarrSeries.length} series from Sonarr`);
      await syncSonarrSeries(fastify, sonarrSeries, existingMedia);
      sonarrCount = sonarrSeries.length;
    }

    const durationMs = Date.now() - startTime;
    const durationSec = Math.round(durationMs / 1000);

    fastify.log.info(
      {
        radarrCount,
        sonarrCount,
        totalItems: radarrCount + sonarrCount,
        durationSec,
      },
      'Radarr/Sonarr library sync completed (phase 1)'
    );
  } catch (error) {
    fastify.log.error({ error }, 'Radarr/Sonarr library sync failed');
    throw error;
  }
}

/**
 * Sync Radarr movies to database
 */
async function syncRadarrMovies(
  fastify: FastifyInstance,
  radarrMovies: RadarrMovie[],
  existingMedia: Awaited<ReturnType<typeof getMediaWithArrIds>>
): Promise<void> {
  // Use pre-fetched existing media
  const existingByTmdbId = new Map(
    existingMedia.filter(m => m.type === 'movie').map(m => [m.tmdbId, m])
  );

  const itemsToUpsert = radarrMovies.map(movie => {
    const existing = existingByTmdbId.get(movie.tmdbId);

    let status: MediaStatus;
    if (existing?.status === 'available') {
      status = 'available'; // Preserve 'available' from Jellyfin - don't downgrade
    } else if (movie.hasFile) {
      status = 'downloaded'; // Has file but not yet in Jellyfín
    } else {
      status = 'requested'; // In Radarr but no file yet
    }

    return {
      type: 'movie' as const,
      tmdbId: movie.tmdbId,
      radarrId: movie.id,
      status,
    };
  });

  await upsertMediaFromArr(fastify.db, itemsToUpsert);

  // Cleanup: Find movies in DB that are no longer in Radarr
  const currentRadarrIds = new Set(radarrMovies.map(m => m.id));
  const removedRadarrIds = existingMedia
    .filter(m => m.type === 'movie' && m.radarrId !== null && !currentRadarrIds.has(m.radarrId))
    .map(m => m.radarrId as number);

  if (removedRadarrIds.length > 0) {
    const clearedCount = await clearRemovedRadarrItems(fastify.db, removedRadarrIds);
    fastify.log.info(`Cleaned up ${clearedCount} movies removed from Radarr (reset to pending)`);
  }
}

/**
 * Sync Sonarr series to database
 */
async function syncSonarrSeries(
  fastify: FastifyInstance,
  sonarrSeries: SonarrSeries[],
  existingMedia: Awaited<ReturnType<typeof getMediaWithArrIds>>
): Promise<void> {
  // Use pre-fetched existing media
  const existingByTvdbId = new Map(
    existingMedia
      .filter(m => m.type === 'tv' && m.tvdbId !== null)
      .map(m => [m.tvdbId as number, m])
  );

  const itemsToUpsert = sonarrSeries.map(series => {
    const existing = existingByTvdbId.get(series.tvdbId);

    let status: MediaStatus;
    const hasEpisodes = (series.statistics?.episodeFileCount ?? 0) > 0;

    if (existing?.status === 'available') {
      status = 'available'; // Preserve 'available' from Jellyfin - don't downgrade
    } else if (hasEpisodes) {
      status = 'downloaded'; // Has episodes but not yet in Jellyfin
    } else {
      status = 'requested'; // In Sonarr but no episodes yet
    }

    return {
      type: 'tv' as const,
      tmdbId: 0, // Will be enriched later if needed (or if we already have it, upsert preserves it)
      tvdbId: series.tvdbId,
      sonarrId: series.id,
      status,
    };
  });

  await upsertMediaFromArr(fastify.db, itemsToUpsert);

  // Cleanup: Find series in DB that are no longer in Sonarr
  const currentSonarrIds = new Set(sonarrSeries.map(s => s.id));
  const removedSonarrIds = existingMedia
    .filter(m => m.type === 'tv' && m.sonarrId !== null && !currentSonarrIds.has(m.sonarrId))
    .map(m => m.sonarrId as number);

  if (removedSonarrIds.length > 0) {
    const clearedCount = await clearRemovedSonarrItems(fastify.db, removedSonarrIds);
    fastify.log.info(`Cleaned up ${clearedCount} series removed from Sonarr (reset to pending)`);
  }
}

/**
 * Enrich TV shows with TVDB IDs from TMDB
 * Phase 2: Background enrichment - fetches TVDB IDs for shows without them
 * Uses rate limiting to avoid overwhelming TMDB API
 */
export async function enrichTvdbIds(fastify: FastifyInstance): Promise<void> {
  const startTime = Date.now();
  fastify.log.info('Starting TVDB ID enrichment (phase 2)...');

  try {
    // Get TV shows that need TVDB ID enrichment
    const itemsWithoutTvdbId = await getMediaWithoutTvdbId(fastify.db);

    if (itemsWithoutTvdbId.length === 0) {
      fastify.log.info('No TV shows need TVDB ID enrichment');
      return;
    }

    fastify.log.info(`Enriching ${itemsWithoutTvdbId.length} TV shows with TVDB IDs...`);

    let successCount = 0;
    let failCount = 0;

    // Fetch TVDB ID for each show
    for (let i = 0; i < itemsWithoutTvdbId.length; i++) {
      const item = itemsWithoutTvdbId[i];
      if (!item) continue;

      try {
        // Add delay between requests to avoid rate limiting (10 req/s = 100ms delay)
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Fetch details with external_ids
        const details = await fastify.tmdb.getDetails({ id: item.tmdbId, type: 'tv' });

        if (details.type === 'tv' && details.tvdbId) {
          await updateMediaExternalIds(fastify.db, item.id, {
            tvdbId: details.tvdbId,
          });
          successCount++;
        } else {
          // Store -1 as sentinel value to prevent retrying this item in future syncs
          await updateMediaExternalIds(fastify.db, item.id, {
            tvdbId: -1,
          });
          failCount++;
          fastify.log.warn(
            { tmdbId: item.tmdbId },
            'TVDB ID not found in TMDB - marked as unavailable (tvdbId = -1)'
          );
        }

        // Log progress every 20 items
        if ((i + 1) % 20 === 0 || i === itemsWithoutTvdbId.length - 1) {
          fastify.log.info(
            `TVDB enrichment progress: ${i + 1}/${itemsWithoutTvdbId.length} (${successCount} success, ${failCount} fail)`
          );
        }
      } catch (error) {
        // Store -1 as sentinel value to prevent retrying this item in future syncs
        await updateMediaExternalIds(fastify.db, item.id, {
          tvdbId: -1,
        });
        failCount++;
        fastify.log.warn(
          { error, tmdbId: item.tmdbId },
          'Failed to fetch TVDB ID - marked as unavailable'
        );
      }
    }

    const durationMs = Date.now() - startTime;
    const durationSec = Math.round(durationMs / 1000);

    fastify.log.info(
      {
        total: itemsWithoutTvdbId.length,
        successCount,
        failCount,
        durationSec,
      },
      'TVDB ID enrichment completed (phase 2)'
    );
  } catch (error) {
    fastify.log.error({ error }, 'TVDB ID enrichment failed');
    throw error;
  }
}

/**
 * Sync download queue status from Radarr and Sonarr
 * Updates media status to 'downloading' for active downloads
 * Returns current queue state for completion detection
 */
export async function syncArrQueue(fastify: FastifyInstance): Promise<{
  activeCount: number;
  currentDownloadingIds: {
    radarr: Set<number>;
    sonarr: Set<number>;
  };
}> {
  const startTime = Date.now();
  fastify.log.debug('Starting Radarr/Sonarr queue sync...');

  try {
    const queueUpdates: Array<{
      radarrId?: number;
      sonarrId?: number;
      status: 'downloading';
    }> = [];

    const currentlyDownloadingIds = {
      radarr: new Set<number>(),
      sonarr: new Set<number>(),
    };

    // Fetch Radarr queue
    try {
      const radarrQueue = await fastify.arr.getRadarrQueue();
      for (const item of radarrQueue.records) {
        if (item.movieId) {
          currentlyDownloadingIds.radarr.add(item.movieId);
          queueUpdates.push({ radarrId: item.movieId, status: 'downloading' });
        }
      }
      if (radarrQueue.records.length > 0) {
        fastify.log.info(`Found ${radarrQueue.records.length} items in Radarr queue`);
      }
    } catch (error) {
      fastify.log.warn({ error }, 'Failed to fetch Radarr queue');
    }

    // Fetch Sonarr queue
    try {
      const sonarrQueue = await fastify.arr.getSonarrQueue();
      for (const item of sonarrQueue.records) {
        if (item.seriesId) {
          currentlyDownloadingIds.sonarr.add(item.seriesId);
          queueUpdates.push({ sonarrId: item.seriesId, status: 'downloading' });
        }
      }
      if (sonarrQueue.records.length > 0) {
        fastify.log.info(`Found ${sonarrQueue.records.length} items in Sonarr queue`);
      }
    } catch (error) {
      fastify.log.warn({ error }, 'Failed to fetch Sonarr queue');
    }

    // Update statuses for items IN queue
    if (queueUpdates.length > 0) {
      await batchUpdateMediaStatus(fastify.db, queueUpdates);
      fastify.log.info(`Updated ${queueUpdates.length} items to 'downloading' status`);
    }

    const durationMs = Date.now() - startTime;
    const durationSec = Math.round(durationMs / 1000);

    fastify.log.debug(
      {
        queueItems: queueUpdates.length,
        durationSec,
      },
      'Radarr/Sonarr queue sync completed'
    );

    return {
      activeCount: queueUpdates.length,
      currentDownloadingIds: currentlyDownloadingIds,
    };
  } catch (error) {
    fastify.log.error({ error }, 'Radarr/Sonarr queue sync failed');
    throw error;
  }
}

/**
 * Run complete Radarr/Sonarr library sync (library + TVDB enrichment)
 * Queue sync runs separately on its own faster schedule
 */
export async function syncArrComplete(fastify: FastifyInstance): Promise<void> {
  fastify.log.info('Starting Radarr/Sonarr library sync...');
  const startTime = Date.now();

  try {
    // Phase 1: Library sync (fast, stores basic data)
    await syncArrLibrary(fastify);

    // Phase 2: TVDB enrichment (slower, API rate limited)
    await enrichTvdbIds(fastify);

    const durationMs = Date.now() - startTime;
    const durationMin = Math.round(durationMs / 60_000);

    fastify.log.info({ durationMin }, 'Radarr/Sonarr library sync finished successfully');
  } catch (error) {
    fastify.log.error({ error }, 'Radarr/Sonarr library sync failed');
  }
}

/**
 * Start recurring Radarr/Sonarr library sync scheduler
 * Runs library sync (movies/series + TVDB enrichment) every 30 minutes
 * Queue sync runs on a separate faster schedule
 */
export function startArrLibrarySyncScheduler(fastify: FastifyInstance): void {
  const SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

  async function runScheduledSync() {
    try {
      await syncArrComplete(fastify);
    } catch (error) {
      fastify.log.error({ error }, 'Scheduled Radarr/Sonarr library sync failed');
    } finally {
      // Reschedule next run
      const timer = setTimeout(runScheduledSync, SYNC_INTERVAL_MS);
      timer.unref(); // Don't keep Node.js process alive for this timer
    }
  }

  // Start first run
  fastify.log.info({ intervalMinutes: 30 }, 'Starting Radarr/Sonarr library sync scheduler');
  runScheduledSync();
}

/**
 * Start recurring Radarr/Sonarr queue sync scheduler
 * Adaptive polling: 2 minutes when idle, 10 seconds when downloads are active
 * Detects completions by comparing previous vs current downloading IDs
 * Triggers library sync immediately when any download completes
 */
export function startArrQueueSyncScheduler(fastify: FastifyInstance): void {
  const IDLE_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes when no active downloads
  const ACTIVE_INTERVAL_MS = 10 * 1000; // 10 seconds when downloads are active
  let hasActiveDownloads = false;

  // Track downloading IDs across runs to detect completions
  let previousDownloadingIds = {
    radarr: new Set<number>(),
    sonarr: new Set<number>(),
  };

  async function runScheduledQueueSync() {
    try {
      // Track if there were active downloads before this run
      const previouslyActive = hasActiveDownloads;

      // Check queue and update statuses
      const queueResult = await syncArrQueue(fastify);

      // Determine if there are currently active downloads
      hasActiveDownloads = queueResult.activeCount > 0;

      // Detect completions by comparing previous vs current downloading IDs
      const completedRadarrIds = [...previousDownloadingIds.radarr].filter(
        id => !queueResult.currentDownloadingIds.radarr.has(id)
      );
      const completedSonarrIds = [...previousDownloadingIds.sonarr].filter(
        id => !queueResult.currentDownloadingIds.sonarr.has(id)
      );

      const hasCompletions = completedRadarrIds.length > 0 || completedSonarrIds.length > 0;

      if (hasCompletions) {
        fastify.log.info(
          {
            completedMovies: completedRadarrIds.length,
            completedSeries: completedSonarrIds.length,
          },
          'Downloads completed - triggering library sync for immediate status update'
        );

        // Trigger library sync to upgrade completed items to 'downloaded' status
        syncArrLibrary(fastify).catch(error => {
          fastify.log.warn({ error }, 'Triggered library sync after completed downloads failed');
        });
      }

      // Store current downloading IDs for next comparison
      previousDownloadingIds = queueResult.currentDownloadingIds;

      // Log state transitions
      if (!previouslyActive && hasActiveDownloads) {
        fastify.log.info(
          { activeDownloads: queueResult.activeCount },
          'Active downloads detected - switching to fast polling (10s)'
        );
      } else if (previouslyActive && !hasActiveDownloads) {
        fastify.log.info('No active downloads - switching to slow polling (2min)');
      }
    } catch (error) {
      fastify.log.error({ error }, 'Scheduled Radarr/Sonarr queue sync failed');
    } finally {
      // Adaptive interval: faster when downloads are active
      const interval = hasActiveDownloads ? ACTIVE_INTERVAL_MS : IDLE_INTERVAL_MS;
      const timer = setTimeout(runScheduledQueueSync, interval);
      timer.unref(); // Don't keep Node.js process alive for this timer
    }
  }

  // Start first run
  fastify.log.info(
    { idleIntervalSec: 120, activeIntervalSec: 10 },
    'Starting Radarr/Sonarr queue sync scheduler (adaptive polling with completion detection)'
  );
  runScheduledQueueSync();
}
