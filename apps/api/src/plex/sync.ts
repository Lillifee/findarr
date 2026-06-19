import { isDefined } from '@findarr/shared/utils';

import type { SchedulerContext } from '../scheduler/types.js';
import { clearRemovedLibItems, getMediaWithLibIds, upsertMediaFromPlex } from './repository.js';

/**
 * Sync Plex library to database.
 * Updates media table with available items from Plex.
 */
export async function syncPlexLibrary(context: SchedulerContext): Promise<void> {
  const syncStartedAt = Date.now();
  context.log.info({ name: 'plex' }, 'Starting library sync');

  const isConnected = await context.plex.testConnection();

  if (!isConnected) {
    throw new Error('Plex connection test failed');
  }

  context.log.debug({ name: 'plex' }, 'Connection successful');

  const plexItems = await context.plex.listLibraryItems();

  if (plexItems.length === 0) {
    context.log.warn({ name: 'plex' }, 'No items found with TMDB IDs');
    return;
  }

  const affectedRows = await upsertMediaFromPlex(context.db, plexItems);

  const mediaWithLibIds = await getMediaWithLibIds(context.db);
  const currentLibIds = new Set(plexItems.map((item) => item.libId));
  const removedLibIds = mediaWithLibIds
    .map((mediaRecord) => mediaRecord.libId)
    .filter((libId) => isDefined(libId))
    .filter((libId) => !currentLibIds.has(libId));

  if (removedLibIds.length > 0) {
    const clearedCount = await clearRemovedLibItems(context.db, removedLibIds);
    context.log.info({ name: 'plex', clearedCount }, 'Cleaned up removed items');
  }

  const durationMs = Date.now() - syncStartedAt;

  context.log.info(
    {
      name: 'plex',
      totalFetched: plexItems.length,
      affectedRows,
      durationMs,
    },
    'Library sync completed',
  );
}
