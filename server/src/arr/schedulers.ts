import type { FastifyInstance } from 'fastify';
import { createScheduler, type Scheduler } from '../scheduler/types.js';
import type { AnyArrService } from './service.js';
import { syncComplete, syncLibrary, syncQueue } from './sync.js';

/**
 * Generic Arr Library Sync Scheduler Factory
 * Creates a scheduler for complete library sync (Radarr or Sonarr)
 * Runs every 30 minutes
 */
export function createArrLibrarySyncScheduler(arrService: AnyArrService): Scheduler {
  return createScheduler(
    {
      name: `${arrService.config.service}LibrarySync`,
      description: `${arrService.config.service} library sync every 30 minutes`,
      interval: 30 * 60 * 1000, // 30 minutes
      enabled: true,
      runOnStartup: true,
    },
    async (fastify: FastifyInstance) => {
      await syncComplete(fastify, arrService);
      return true; // Continue
    }
  );
}

/**
 * Generic Arr Queue Monitor Scheduler Factory
 * Creates a scheduler that checks for active downloads every 2 minutes
 * Triggers fast scheduler when downloads detected
 */
export function createArrQueueMonitorScheduler(arrService: AnyArrService): Scheduler {
  const fastSyncName = `${arrService.config.service}QueueFastSync` as const;

  return createScheduler(
    {
      name: `${arrService.config.service}QueueMonitor`,
      description: `Check for active ${arrService.config.service} downloads every 2 minutes`,
      interval: 2 * 60 * 1000, // 2 minutes
      enabled: true,
      runOnStartup: true,
    },
    async (fastify: FastifyInstance) => {
      const queue = await arrService.getQueue();
      const activeCount = queue.records.length;

      if (activeCount > 0) {
        fastify.log.info(
          { activeDownloads: activeCount },
          `Active ${arrService.config.service} downloads detected - starting fast sync`
        );
        fastify.scheduler.start(fastSyncName);
      }

      return true; // Continue
    }
  );
}

/**
 * Generic Arr Queue Fast Sync Scheduler Factory
 * Creates a fast polling scheduler (every 10 seconds) while downloads are active
 * Detects completions and triggers library + Jellyfin queue sync
 * Self-terminates when no active downloads
 */
export function createArrQueueFastSyncScheduler(arrService: AnyArrService): Scheduler {
  // Closure-scoped state for tracking downloads across runs
  let previousDownloadingIds = new Set<number>();

  return createScheduler(
    {
      name: `${arrService.config.service}QueueFastSync`,
      description: `Fast polling (10s) while ${arrService.config.service} downloads active`,
      interval: 10 * 1000, // 10 seconds
      enabled: false, // Triggered by monitor
      runOnStartup: false,
      minRuntime: 60 * 1000, // Don't self-terminate for 60 seconds (handles delayed downloads)
    },
    async (fastify: FastifyInstance) => {
      // Sync queue and get current state
      const { currentDownloadingIds, completedIds, hasActiveDownloads } = await syncQueue(
        fastify,
        arrService,
        previousDownloadingIds
      );

      // Handle completions
      if (completedIds.length > 0) {
        fastify.log.info(
          { [`completed${arrService.config.service}`]: completedIds.length },
          `${arrService.config.service} downloads completed - triggering library sync`
        );

        // Trigger library sync to upgrade completed items to 'downloaded' status
        await syncLibrary(fastify, arrService);

        // Trigger Jellyfin queue sync
        fastify.scheduler.start('jellyfinQueueSync');
      }

      // Update state for next run
      previousDownloadingIds = currentDownloadingIds;

      // Self-terminate if no active downloads (service enforces minRuntime)
      return hasActiveDownloads;
    }
  );
}
