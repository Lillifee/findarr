import type { FastifyInstance } from 'fastify';
import { upsertMediaFromJellyfin } from './repository.js';

/**
 * Sync Jellyfin library to database
 * Updates media table with available items from Jellyfin
 * @param fastify - Fastify instance
 * @param fullSync - If true, fetches all media; if false, fetches only recent items (default: true)
 */
export async function syncJellyfinLibrary(fastify: FastifyInstance): Promise<void> {
  const startTime = Date.now();
  fastify.log.info(`Starting jellyfin library sync...`);

  // Check if Jellyfin is configured
  const isConfigured = await fastify.jellyfin.isConfigured();

  if (!isConfigured) {
    fastify.log.debug('Jellyfin not configured - skipping sync');
    return;
  }

  // Test connection
  const isConnected = await fastify.jellyfin.testConnection();

  if (!isConnected) {
    throw new Error('Jellyfin connection test failed');
  }

  fastify.log.debug('Jellyfin connection successful');

  // Fetch items from Jellyfin (full or partial based on mode)
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
    `Jellyfin library sync completed`
  );
}
