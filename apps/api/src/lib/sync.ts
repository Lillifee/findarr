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
  const syncStartedAt = Date.now();
  context.appLog.info({ name }, 'Starting library sync');

  const isConnected = await service.testConnection();
  if (!isConnected) {
    throw new Error(`${name} connection test failed`);
  }

  context.appLog.debug({ name }, 'Connection successful');

  const items = await service.listLibraryItems();

  if (items.length === 0) {
    context.appLog.warn({ name }, 'No items found with TMDB IDs');
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
    context.appLog.info({ name, clearedCount }, 'Cleaned up removed items');
  }

  context.appLog.info(
    { name, totalFetched: items.length, affectedRows, durationMs: Date.now() - syncStartedAt },
    'Library sync completed',
  );
}
