import type { FastifyInstance } from 'fastify';
import type { JellyfinMedia } from '../jellyfin/transformers.js';

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

    const db = fastify.db;

    // Only update rows when something actually changed
    const upsertMedia = db.prepare(`
      INSERT INTO media (
        tmdbId,
        mediaType,
        jellyfinId,
        status,
        createdAt,
        updatedAt
      )
      VALUES (?, ?, ?, 'available', unixepoch(), unixepoch())
      ON CONFLICT(tmdbId, mediaType) DO UPDATE SET
        jellyfinId = excluded.jellyfinId,
        status = 'available',
        updatedAt = unixepoch()
      WHERE
        jellyfinId IS NOT excluded.jellyfinId
        OR status != 'available'
    `);

    // Transaction automatically rolls back on error
    const syncTransaction = db.transaction((items: JellyfinMedia[]) => {
      let affectedRows = 0;

      for (const item of items) {
        const result = upsertMedia.run(item.tmdbId, item.mediaType, item.jellyfinId);

        if (result.changes > 0) {
          affectedRows++;
        }
      }

      return affectedRows;
    });

    const affectedRows = syncTransaction(jellyfinItems);
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
export function startSyncScheduler(
  fastify: FastifyInstance,
  intervalMinutes: number
): NodeJS.Timeout {
  // TODO refactor to recursive

  const intervalMs = intervalMinutes * 60 * 1000;

  fastify.log.info(`Starting Jellyfin sync scheduler (every ${intervalMinutes} minutes)`);

  const timer = setInterval(async () => {
    try {
      await syncJellyfinLibrary(fastify);
    } catch (error) {
      fastify.log.error({ error }, 'Scheduled Jellyfin sync failed');
      // Don't throw - keep scheduler running
    }
  }, intervalMs);

  // Allow Node.js to exit if this is the only thing running
  timer.unref();

  return timer;
}
