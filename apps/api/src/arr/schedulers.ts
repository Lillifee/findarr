import { createScheduler, type Scheduler, type SchedulerContext } from '../scheduler/types.js';
import type { AnyArrService } from './service.js';
import { syncLibrary, syncQueue } from './sync.js';

/**
 * Runs `task` only when the Arr service is configured AND reachable.
 */
export async function whenReady(
  context: SchedulerContext,
  arrService: AnyArrService,
  task: () => Promise<boolean>,
): Promise<boolean> {
  const { service } = arrService.config;

  if (!arrService.isConfigured()) {
    context.log.debug({ name: service }, 'Not configured - skipping run');
    return false;
  }

  if (!(await arrService.testConnection())) {
    throw new Error(`${service} connection test failed`);
  }

  return task();
}

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
      interval: 30 * 60 * 1000,
      enabled: true,
      runOnStartup: true,
    },
    async (context: SchedulerContext) =>
      whenReady(context, arrService, async () => {
        await syncLibrary(context, arrService);
        return true;
      }),
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
      interval: 2 * 60 * 1000,
      enabled: true,
      runOnStartup: true,
    },
    async (context: SchedulerContext) =>
      whenReady(context, arrService, async () => {
        const queueItems = await arrService.getQueue(1);

        if (queueItems.length > 0) {
          context.log.info(
            {
              name: arrService.config.service,
              activeDownloads: queueItems.length,
            },
            'Active downloads detected - starting fast sync',
          );
          context.scheduler.start({ name: fastSyncName });
        }

        return true;
      }),
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
      interval: 10 * 1000,
      enabled: false,
      runOnStartup: false,

      // Don't self-terminate for 60 seconds (handles delayed downloads)
      minRuntime: 60 * 1000,
    },
    async (context: SchedulerContext) =>
      whenReady(context, arrService, async () => {
        // Sync queue and get current state
        const { currentDownloadingIds, completedIds, hasActiveDownloads } = await syncQueue(
          context,
          arrService,
          previousDownloadingIds,
        );

        // Handle completions
        if (completedIds.length > 0) {
          context.log.info(
            {
              name: arrService.config.service,
              completedDownloads: completedIds.length,
            },
            'Downloads completed - triggering library sync',
          );

          // Trigger library sync to upgrade completed items to 'downloaded' status
          await syncLibrary(context, arrService);

          // Trigger library queue sync
          context.scheduler.start({ name: 'jellyfinQueueSync' });
          context.scheduler.start({ name: 'plexQueueSync' });
        }

        // Update state for next run
        previousDownloadingIds = currentDownloadingIds;

        // Self-terminate if no active downloads (service enforces minRuntime)
        return hasActiveDownloads;
      }),
  );
}
