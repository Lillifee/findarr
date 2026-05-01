export interface FeedSnapshot<T> {
  id: string;
  items: T[];
}

export interface FeedPage<T> {
  items: T[];
  page: number;
  totalPages: number;
}

export function createFeedSnapshotStore<T>(ttlMs: number = 5 * 60 * 1000) {
  const snapshots = new Map<string, { items: T[]; createdAt: number }>();

  async function getOrCreate(
    feedId: string | undefined,
    createItems: () => Promise<T[]>
  ): Promise<FeedSnapshot<T>> {
    const existing = get(feedId);
    if (existing) {
      return existing;
    }

    const items = await createItems();
    return create(items);
  }

  function get(feedId: string | undefined): FeedSnapshot<T> | null {
    if (!feedId) {
      return null;
    }

    const now = Date.now();
    const existing = snapshots.get(feedId);
    if (existing && now - existing.createdAt < ttlMs) {
      return { id: feedId, items: existing.items };
    }

    // Drop expired entries when encountered.
    if (existing) {
      snapshots.delete(feedId);
    }

    return null;
  }

  function create(items: T[]): FeedSnapshot<T> {
    const newId = crypto.randomUUID();
    snapshots.set(newId, { items, createdAt: Date.now() });
    return { id: newId, items };
  }

  // TODO we could make this as a nested function of a feed, then we don't have to pass allItems
  function getPage(allItems: T[], page: number, itemsPerPage: number = 20): FeedPage<T> {
    const startIndex = Math.max(0, (page - 1) * itemsPerPage);
    const totalPages = Math.ceil(allItems.length / itemsPerPage);
    const items = allItems.slice(startIndex, startIndex + itemsPerPage);

    return { items, page, totalPages };
  }

  return { getOrCreate, getPage };
}
