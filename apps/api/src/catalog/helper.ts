import { isDefined } from '@findarr/shared/utils';

const DEFAULT_FEED_TTL_MS = 5 * 60 * 1000;
const MAX_SOURCE_PAGES_PER_REQUEST = 10;

function cleanupExpiredEntries<T extends { createdAt: number }>(
  entries: Map<string, T>,
  now: number,
  ttlMs: number,
) {
  for (const [key, entry] of entries) {
    if (now - entry.createdAt >= ttlMs) {
      entries.delete(key);
    }
  }
}

type DiscoveryFeed<T> = {
  items: T[];
  keys: Set<string>;
  nextSourcePage: number;
  nextItemIndex: number;
  exhausted: boolean;
  createdAt: number;
  pending: Promise<{ items: T[]; hasMore: boolean }> | null;
};

export function createFeedSnapshotStore<T>(ttlMs = DEFAULT_FEED_TTL_MS) {
  const snapshotEntries = new Map<string, { items: T[]; createdAt: number; nextIndex: number }>();

  function createFeedSnapshot(
    id: string,
    entry: { items: T[]; createdAt: number; nextIndex: number },
  ) {
    function getNextPage(isAvailable: (item: T) => boolean, sourceOffset = 0, itemsPerPage = 20) {
      const availableItems = entry.items.slice(sourceOffset).filter((x) => isAvailable(x));
      const pageItems = availableItems.slice(entry.nextIndex, entry.nextIndex + itemsPerPage);
      entry.nextIndex += pageItems.length;

      return { items: pageItems, hasMore: entry.nextIndex < availableItems.length };
    }

    return { id, items: entry.items, getNextPage };
  }

  function getSnapshot(feedId: string | undefined) {
    if (!isDefined(feedId)) {
      return null;
    }

    const now = Date.now();
    const existingEntry = snapshotEntries.get(feedId);
    if (existingEntry && now - existingEntry.createdAt < ttlMs) {
      return createFeedSnapshot(feedId, existingEntry);
    }

    // Drop expired entries when encountered.
    if (existingEntry) {
      snapshotEntries.delete(feedId);
    }

    return null;
  }

  function createSnapshot(items: T[]) {
    const now = Date.now();
    cleanupExpiredEntries(snapshotEntries, now, ttlMs);

    const snapshotId = crypto.randomUUID();
    const entry = { items, createdAt: now, nextIndex: 0 };
    snapshotEntries.set(snapshotId, entry);
    return createFeedSnapshot(snapshotId, entry);
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

export function createDiscoveryFeedStore<T>(
  getKey: (item: T) => string,
  ttlMs = DEFAULT_FEED_TTL_MS,
) {
  const feeds = new Map<string, DiscoveryFeed<T>>();

  function getOrCreateFeed(feedId: string | undefined) {
    const now = Date.now();
    cleanupExpiredEntries(feeds, now, ttlMs);

    if (isDefined(feedId)) {
      const existingFeed = feeds.get(feedId);
      if (isDefined(existingFeed)) {
        return { id: feedId, feed: existingFeed };
      }
    }

    const id = feedId ?? crypto.randomUUID();
    const feed: DiscoveryFeed<T> = {
      items: [],
      keys: new Set<string>(),
      nextSourcePage: 1,
      nextItemIndex: 0,
      exhausted: false,
      createdAt: now,
      pending: null,
    };
    feeds.set(id, feed);
    return { id, feed };
  }

  async function readNextBatch(
    feed: DiscoveryFeed<T>,
    itemsPerPage: number,
    fetchPage: (page: number) => Promise<T[]>,
    isAvailable: (item: T) => boolean,
  ) {
    const batchItems: T[] = [];
    let pagesFetched = 0;

    function collectBufferedItems() {
      while (feed.nextItemIndex < feed.items.length && batchItems.length < itemsPerPage) {
        const item = feed.items[feed.nextItemIndex];
        feed.nextItemIndex += 1;
        if (item !== undefined && isAvailable(item)) {
          batchItems.push(item);
        }
      }
    }

    collectBufferedItems();

    while (
      batchItems.length < itemsPerPage &&
      !feed.exhausted &&
      pagesFetched < MAX_SOURCE_PAGES_PER_REQUEST
    ) {
      // oxlint-disable-next-line no-await-in-loop
      const items = await fetchPage(feed.nextSourcePage);
      feed.nextSourcePage += 1;
      pagesFetched += 1;

      if (items.length === 0) {
        feed.exhausted = true;
        break;
      }

      for (const item of items) {
        const key = getKey(item);
        if (!feed.keys.has(key)) {
          feed.keys.add(key);
          feed.items.push(item);
        }
      }

      collectBufferedItems();
    }

    return {
      items: batchItems,
      hasMore: feed.nextItemIndex < feed.items.length || !feed.exhausted,
    };
  }

  async function getNextBatch(
    feedId: string | undefined,
    itemsPerPage: number,
    fetchPage: (page: number) => Promise<T[]>,
    isAvailable: (item: T) => boolean,
  ) {
    const { id, feed } = getOrCreateFeed(feedId);

    const request = feed.pending ?? readNextBatch(feed, itemsPerPage, fetchPage, isAvailable);
    feed.pending = request;

    try {
      const result = await request;
      return { id, ...result };
    } finally {
      if (feed.pending === request) {
        feed.pending = null;
      }
    }
  }

  return { getNextBatch };
}
