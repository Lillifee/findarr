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
 */
export async function syncJellyfinLibrary(fastify: FastifyInstance): Promise<void> {
  const isConfigured = await fastify.jellyfin.isConfigured();

  if (!isConfigured) {
    fastify.log.debug({ name: 'jellyfin' }, 'Not configured - skipping sync');
    return;
  }

  const syncStartedAt = Date.now();
  fastify.log.info({ name: 'jellyfin' }, 'Starting library sync');

  const isConnected = await fastify.jellyfin.testConnection();

  if (!isConnected) {
    throw new Error('Jellyfin connection test failed');
  }

  fastify.log.debug({ name: 'jellyfin' }, 'Connection successful');

  const jellyfinItems = await fastify.jellyfin.listLibraryItems();

  if (jellyfinItems.length === 0) {
    fastify.log.warn({ name: 'jellyfin' }, 'No items found with TMDB IDs');
    return;
  }

  const affectedRows = await upsertMediaFromJellyfin(fastify.db, jellyfinItems);

  const mediaWithJellyfinIds = await getMediaWithJellyfinIds(fastify.db);
  const currentJellyfinIds = new Set(jellyfinItems.map(item => item.jellyfinId));
  const removedJellyfinIds = mediaWithJellyfinIds
    .map(mediaRecord => mediaRecord.jellyfinId)
    .filter(jellyfinId => isDefined(jellyfinId))
    .filter(jellyfinId => !currentJellyfinIds.has(jellyfinId));

  if (removedJellyfinIds.length > 0) {
    const clearedCount = await clearRemovedJellyfinItems(fastify.db, removedJellyfinIds);
    fastify.log.info({ name: 'jellyfin', clearedCount }, 'Cleaned up removed items');
  }

  const durationMs = Date.now() - syncStartedAt;

  fastify.log.info(
    {
      name: 'jellyfin',
      totalFetched: jellyfinItems.length,
      affectedRows,
      durationMs,
    },
    'Library sync completed'
  );
}
