import { isDefined } from '@findarr/shared';

export interface FeedSnapshot<T> {
  id: string;
  items: T[];
}

export interface FeedPage<T> {
  items: T[];
  page: number;
  totalPages: number;
}

// TODO we could make this as a nested function of a feed, then we don't have to pass allItems
function getSnapshotPage<T>(allItems: T[], page: number, itemsPerPage = 20): FeedPage<T> {
  const startIndex = Math.max(0, (page - 1) * itemsPerPage);
  const totalPages = Math.ceil(allItems.length / itemsPerPage);
  const items = allItems.slice(startIndex, startIndex + itemsPerPage);

  return { items, page, totalPages };
}

export function createFeedSnapshotStore<T>(ttlMs: number = 5 * 60 * 1000) {
  const snapshotEntries = new Map<string, { items: T[]; createdAt: number }>();

  function getSnapshot(feedId: string | undefined): FeedSnapshot<T> | null {
    if (!isDefined(feedId)) {
      return null;
    }

    const now = Date.now();
    const existingEntry = snapshotEntries.get(feedId);
    if (existingEntry && now - existingEntry.createdAt < ttlMs) {
      return { id: feedId, items: existingEntry.items };
    }

    // Drop expired entries when encountered.
    if (existingEntry) {
      snapshotEntries.delete(feedId);
    }

    return null;
  }

  function createSnapshot(items: T[]): FeedSnapshot<T> {
    const snapshotId = crypto.randomUUID();
    snapshotEntries.set(snapshotId, { items, createdAt: Date.now() });
    return { id: snapshotId, items };
  }

  async function getOrCreateSnapshot(
    feedId: string | undefined,
    createItems: () => Promise<T[]>,
  ): Promise<FeedSnapshot<T>> {
    const existingSnapshot = getSnapshot(feedId);
    if (existingSnapshot) {
      return existingSnapshot;
    }

    const snapshotItems = await createItems();
    return createSnapshot(snapshotItems);
  }

  return { getOrCreateSnapshot, getSnapshotPage };
}
