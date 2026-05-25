import { getMediaByStatusPaginated } from '../media/repository.js';
import { createScheduler, type Scheduler, type SchedulerContext } from '../scheduler/types.js';
import { syncJellyfinLibrary } from './sync.js';

/**
 * Jellyfin Library Sync Scheduler
 * Runs full library sync every 30 minutes
 */
export function createJellyfinLibrarySyncScheduler(): Scheduler {
  return createScheduler(
    {
      name: 'jellyfinLibrarySync',
      description: 'Full Jellyfin library sync every 30 minutes',
      interval: 30 * 60 * 1000, // 30 minutes
      enabled: true,
      runOnStartup: true,
    },
    async (context: SchedulerContext) => {
      const isConfigured = context.jellyfin.isConfigured();

      if (!isConfigured) {
        context.log.debug({ name: 'jellyfin' }, 'Not configured - skipping sync');
        return false;
      }

      await syncJellyfinLibrary(context); // Full sync
      return true; // Continue
    }
  );
}

/**
 * Jellyfin Queue Sync Scheduler
 * Triggered manually, runs partial sync every 10 seconds
 * Self-terminates when all downloaded items become available
 */
export function createJellyfinQueueSyncScheduler(): Scheduler {
  return createScheduler(
    {
      name: 'jellyfinQueueSync',
      description: 'Partial sync (10s) for recent downloads, self-terminates when done',
      interval: 10 * 1000, // 10 seconds
      enabled: false, // Disabled by default, triggered manually
      runOnStartup: false,
      maxRuntime: 120 * 1000, // Maximum 2 minutes runtime.
    },
    async (context: SchedulerContext) => {
      const isConfigured = context.jellyfin.isConfigured();

      if (!isConfigured) {
        context.log.debug({ name: 'jellyfin' }, 'Not configured - skipping sync');
        return false;
      }

      // Run partial sync to check recent items
      await syncJellyfinLibrary(context);

      // Check if should continue
      // TODO Sometimes items cant be linked to the sonar/radarr and the downloaded status will
      // never change to available.
      // We added a maxRuntime of 2 minutes to prevent the scheduler from running indefinitely.
      // Would be nice collect those items and show them in the UI for manual intervention.
      const downloadedMediaPage = await getMediaByStatusPaginated(context.db, ['downloaded'], {
        offset: 0,
        limit: 1,
      });

      if (downloadedMediaPage.totalCount === 0) {
        context.log.info(
          { name: 'jellyfin', schedulerName: 'jellyfinQueueSync' },
          'All downloaded items are now available - stopping queue sync'
        );
        return false; // Self-terminate
      }

      return true; // Continue
    }
  );
}
