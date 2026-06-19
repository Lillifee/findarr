import { isDefined } from '@findarr/shared/utils';

import type { SchedulerContext } from '../scheduler/types.js';
import { clearRemovedLibItems, getMediaWithLibIds, upsertMediaFromJellyfin } from './repository.js';

/**
 * Sync Jellyfin library to database
 * Updates media table with available items from Jellyfin
 */
export async function syncJellyfinLibrary(context: SchedulerContext): Promise<void> {
  const syncStartedAt = Date.now();
  context.log.info({ name: 'jellyfin' }, 'Starting library sync');

  const isConnected = await context.jellyfin.testConnection();

  if (!isConnected) {
    throw new Error('Jellyfin connection test failed');
  }

  context.log.debug({ name: 'jellyfin' }, 'Connection successful');

  const jellyfinItems = await context.jellyfin.listLibraryItems();

  if (jellyfinItems.length === 0) {
    context.log.warn({ name: 'jellyfin' }, 'No items found with TMDB IDs');
    return;
  }

  const affectedRows = await upsertMediaFromJellyfin(context.db, jellyfinItems);

  const mediaWithLibIds = await getMediaWithLibIds(context.db);
  const currentLibIds = new Set(jellyfinItems.map((item) => item.libId));
  const removedLibIds = mediaWithLibIds
    .map((mediaRecord) => mediaRecord.libId)
    .filter((libId) => isDefined(libId))
    .filter((libId) => !currentLibIds.has(libId));

  if (removedLibIds.length > 0) {
    const clearedCount = await clearRemovedLibItems(context.db, removedLibIds);
    context.log.info({ name: 'jellyfin', clearedCount }, 'Cleaned up removed items');
  }

  const durationMs = Date.now() - syncStartedAt;

  context.log.info(
    {
      name: 'jellyfin',
      totalFetched: jellyfinItems.length,
      affectedRows,
      durationMs,
    },
    'Library sync completed',
  );
}
