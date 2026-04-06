import { isDefined } from '@findarr/shared';
import type { FastifyInstance } from 'fastify';
import {
  clearRemovedJellyfinItems,
  getMediaWithJellyfinIds,
  upsertMediaFromJellyfin,
} from './repository.js';

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

  // Cleanup: Find items in DB that are no longer in Jellyfin
  const existingMedia = await getMediaWithJellyfinIds(fastify.db);
  const currentJellyfinIds = new Set(jellyfinItems.map(item => item.jellyfinId));
  const removedJellyfinIds = existingMedia
    .map(m => m.jellyfinId)
    .filter(jellyfinId => isDefined(jellyfinId))
    .filter(jellyfinId => !currentJellyfinIds.has(jellyfinId));

  if (removedJellyfinIds.length > 0) {
    const clearedCount = await clearRemovedJellyfinItems(fastify.db, removedJellyfinIds);
    fastify.log.info(`Cleaned up ${clearedCount} items removed from Jellyfin`);
  }

  const durationMs = Date.now() - startTime;

  fastify.log.info(
    {
      totalFetched: jellyfinItems.length,
      affectedRows,
      durationMs,
    },
    `Jellyfin library sync completed`
  );
}
