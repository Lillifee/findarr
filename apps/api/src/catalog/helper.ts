import { isDefined } from '@findarr/shared/utils';

export interface FeedPage<T> {
  items: T[];
  page: number;
  totalPages: number;
}

export function createFeedSnapshotStore<T>(ttlMs: number = 5 * 60 * 1000) {
  const snapshotEntries = new Map<string, { items: T[]; createdAt: number }>();

  function cleanupExpiredEntries(now: number) {
    for (const [key, entry] of snapshotEntries) {
      if (now - entry.createdAt >= ttlMs) {
        snapshotEntries.delete(key);
      }
    }
  }

  function feedSnapshot(id: string, items: T[]) {
    function getSnapshotPage(page: number, itemsPerPage = 20): FeedPage<T> {
      const startIndex = Math.max(0, (page - 1) * itemsPerPage);
      const totalPages = Math.ceil(items.length / itemsPerPage);
      const pageItems = items.slice(startIndex, startIndex + itemsPerPage);

      return { items: pageItems, page, totalPages };
    }

    return { id, getSnapshotPage };
  }

  function getSnapshot(feedId: string | undefined) {
    if (!isDefined(feedId)) {
      return null;
    }

    const now = Date.now();
    const existingEntry = snapshotEntries.get(feedId);
    if (existingEntry && now - existingEntry.createdAt < ttlMs) {
      return feedSnapshot(feedId, existingEntry.items);
    }

    // Drop expired entries when encountered.
    if (existingEntry) {
      snapshotEntries.delete(feedId);
    }

    return null;
  }

  function createSnapshot(items: T[]) {
    const now = Date.now();
    cleanupExpiredEntries(now);

    const snapshotId = crypto.randomUUID();
    snapshotEntries.set(snapshotId, { items, createdAt: now });
    return feedSnapshot(snapshotId, items);
  }

  async function getOrCreateSnapshot(feedId: string | undefined, createItems: () => Promise<T[]>) {
    const existingSnapshot = getSnapshot(feedId);
    if (existingSnapshot) {
      return existingSnapshot;
    }

    const snapshotItems = await createItems();
    return createSnapshot(snapshotItems);
  }

  return { getOrCreateSnapshot };
}
