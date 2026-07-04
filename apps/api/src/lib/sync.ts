import { isDefined } from '@findarr/shared/utils';

import type { SchedulerContext } from '../scheduler/types.js';
import { clearRemovedLibItems, getMediaWithLibIds, upsertLibraryMedia } from './repository.js';
import type { LibService } from './service.js';

/**
 * Sync a streaming library (Jellyfin or Plex) to the database.
 * The service instance determines which backend is used.
 */
export async function syncLibrary(context: SchedulerContext, service: LibService): Promise<void> {
  const { service: name } = service.config;
  const log = context.appLog.scope(name);
  const syncStartedAt = Date.now();
  log.info('Starting library sync');

  const isConnected = await service.testConnection();
  if (!isConnected) {
    throw new Error(`${name} connection test failed`);
  }

  log.debug('Connection successful');

  const items = await service.listLibraryItems();

  if (items.length === 0) {
    log.warn('No items found with TMDB IDs');
    return;
  }

  const affectedRows = await upsertLibraryMedia(context.db, items);

  const mediaWithLibIds = await getMediaWithLibIds(context.db);
  const currentLibIds = new Set(items.map((item) => item.libId));
  const removedLibIds = mediaWithLibIds
    .map((r) => r.libId)
    .filter((libId) => isDefined(libId))
    .filter((libId) => !currentLibIds.has(libId));

  if (removedLibIds.length > 0) {
    const clearedCount = await clearRemovedLibItems(context.db, removedLibIds);
    log.info({ clearedCount }, 'Cleaned up removed items');
  }

  log.info(
    { totalFetched: items.length, affectedRows, durationMs: Date.now() - syncStartedAt },
    'Library sync completed',
  );
}
