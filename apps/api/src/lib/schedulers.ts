import { getMediaByStatusPaginated } from '../media/repository.js';
import { createScheduler, type Scheduler, type SchedulerContext } from '../scheduler/types.js';
import type { LibService } from './service.js';
import { syncLibrary } from './sync.js';

/**
 * Generic library sync scheduler factory — works for both Jellyfin and Plex.
 * Runs full library sync every 30 minutes.
 */
export function createLibrarySyncScheduler(service: LibService): Scheduler {
  const { service: name, syncScheduler } = service.config;

  return createScheduler(
    {
      name: syncScheduler,
      description: `Full ${name} library sync every 30 minutes`,
      interval: 30 * 60 * 1000,
      enabled: true,
      runOnStartup: true,
    },
    async (context: SchedulerContext) => {
      if (!service.isConfigured()) {
        context.log.debug({ name }, 'Not configured - skipping sync');
        return false;
      }
      await syncLibrary(context, service);
      return true;
    },
  );
}

/**
 * Generic library queue sync scheduler factory — works for both Jellyfin and Plex.
 * Triggered after downloads complete; polls every 10 seconds and self-terminates.
 */
export function createLibraryQueueSyncScheduler(service: LibService): Scheduler {
  const { service: name, queueSyncScheduler } = service.config;

  return createScheduler(
    {
      name: queueSyncScheduler,
      description: `Partial ${name} sync (10s) for recent downloads, self-terminates when done`,
      interval: 10 * 1000,
      enabled: false,
      runOnStartup: false,
      maxRuntime: 120 * 1000,
    },
    async (context: SchedulerContext) => {
      if (!service.isConfigured()) {
        context.log.debug({ name }, 'Not configured - skipping sync');
        return false;
      }

      await syncLibrary(context, service);

      const downloadedPage = await getMediaByStatusPaginated(context.db, ['downloaded'], {
        offset: 0,
        limit: 1,
      });

      if (downloadedPage.totalCount === 0) {
        context.log.info(
          { name, schedulerName: queueSyncScheduler },
          'All downloaded items are now available - stopping queue sync',
        );
        return false;
      }

      return true;
    },
  );
}
