import type { FastifyInstance } from 'fastify';
import { getMediaByStatusPaginated } from '../media/repository.js';
import { createScheduler, type Scheduler } from '../scheduler/types.js';
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
    async (fastify: FastifyInstance) => {
      await syncJellyfinLibrary(fastify); // Full sync
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
    },
    async (fastify: FastifyInstance) => {
      // Run partial sync to check recent items
      await syncJellyfinLibrary(fastify);

      // Check if should continue
      const downloadedMediaPage = await getMediaByStatusPaginated(fastify.db, ['downloaded'], {
        offset: 0,
        limit: 1,
      });

      if (downloadedMediaPage.totalCount === 0) {
        fastify.log.info(
          { name: 'jellyfin', schedulerName: 'jellyfinQueueSync' },
          'All downloaded items are now available - stopping queue sync'
        );
        return false; // Self-terminate
      }

      return true; // Continue
    }
  );
}
