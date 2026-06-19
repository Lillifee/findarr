import { getMediaByStatusPaginated } from '../media/repository.js';
import { createScheduler, type Scheduler, type SchedulerContext } from '../scheduler/types.js';
import { syncPlexLibrary } from './sync.js';

/**
 * Plex Library Sync Scheduler
 * Runs full library sync every 30 minutes.
 */
export function createPlexLibrarySyncScheduler(): Scheduler {
  return createScheduler(
    {
      name: 'plexLibrarySync',
      description: 'Full Plex library sync every 30 minutes',
      interval: 30 * 60 * 1000,
      enabled: true,
      runOnStartup: true,
    },
    async (context: SchedulerContext) => {
      if (!context.plex.isConfigured()) {
        context.log.debug({ name: 'plex' }, 'Not configured - skipping sync');
        return false;
      }

      await syncPlexLibrary(context);
      return true;
    },
  );
}

/**
 * Plex Queue Sync Scheduler
 * Triggered manually, runs partial sync every 10 seconds.
 * Self-terminates when all downloaded items become available.
 */
export function createPlexQueueSyncScheduler(): Scheduler {
  return createScheduler(
    {
      name: 'plexQueueSync',
      description: 'Partial sync (10s) for recent downloads, self-terminates when done',
      interval: 10 * 1000,
      enabled: false,
      runOnStartup: false,
      maxRuntime: 120 * 1000,
    },
    async (context: SchedulerContext) => {
      if (!context.plex.isConfigured()) {
        context.log.debug({ name: 'plex' }, 'Not configured - skipping sync');
        return false;
      }

      await syncPlexLibrary(context);

      const downloadedMediaPage = await getMediaByStatusPaginated(context.db, ['downloaded'], {
        offset: 0,
        limit: 1,
      });

      if (downloadedMediaPage.totalCount === 0) {
        context.log.info(
          { name: 'plex', schedulerName: 'plexQueueSync' },
          'All downloaded items are now available - stopping queue sync',
        );
        return false;
      }

      return true;
    },
  );
}
