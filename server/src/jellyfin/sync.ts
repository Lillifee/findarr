import type { FastifyInstance } from 'fastify';
import { upsertMediaFromJellyfin } from './repository.js';

/**
 * Sync Jellyfin library to database
 * Updates media table with available items from Jellyfin
 */
export async function syncJellyfinLibrary(fastify: FastifyInstance): Promise<void> {
  const startTime = Date.now();
  fastify.log.info('Jellyfin starting library sync...');

  try {
    // Test connection first
    fastify.log.info('Jellyfin testing connection...');
    const isConnected = await fastify.jellyfin.testConnection();

    if (!isConnected) {
      throw new Error('Jellyfin connection test failed');
    }

    fastify.log.info('Jellyfin connection successful');

    // Fetch all items from Jellyfin
    const jellyfinItems = await fastify.jellyfin.getAllMedia();

    if (jellyfinItems.length === 0) {
      fastify.log.warn('No items found in Jellyfin with TMDB IDs');
      return;
    }

    // Upsert media items into database
    const affectedRows = await upsertMediaFromJellyfin(fastify.db, jellyfinItems);
    const durationMs = Date.now() - startTime;

    // TODO - until now only insert and update is implemented. we also need to delete items that are no longer available in jellyfin.
    // we can do this by adding a "lastSeen" column to the media table and updating it with the current timestamp during sync.
    // or get all media items with jellyfinId and check if they are still in the fetched items. if not delete them.

    fastify.log.info(
      {
        totalFetched: jellyfinItems.length,
        affectedRows,
        durationMs,
      },
      'Jellyfin library sync completed'
    );
  } catch (error) {
    fastify.log.error({ error }, 'Jellyfin sync failed');
    // TODO check error handling
  }
}

/**
 * Start background sync scheduler
 * Returns timer handle for cleanup
 */
export function startSyncScheduler(fastify: FastifyInstance, intervalMinutes: number) {
  const intervalMs = intervalMinutes * 60 * 1000;

  fastify.log.info(`Starting Jellyfin sync scheduler (every ${intervalMinutes} minutes)`);

  const run = async (): Promise<void> => {
    await syncJellyfinLibrary(fastify)
      .catch(error => {
        fastify.log.error({ error }, 'Scheduled Jellyfin sync failed');
      })
      .finally(() => {
        timer = setTimeout(run, intervalMs);
        timer.unref();
      });
  };

  let timer = setTimeout(run, intervalMs);
  timer.unref();

  return timer;
}
