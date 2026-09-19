import { isDefined } from '@findarr/shared/utils';

const DEFAULT_FEED_TTL_MS = 5 * 60 * 1000;

export interface FeedPage<T> {
  items: T[];
  page: number;
  totalPages: number;
}

type DiscoveryFeed<T> = {
  items: T[];
  keys: Set<string>;
  nextPage: number;
  pagesFetched: number;
  exhausted: boolean;
  createdAt: number;
  pending: Promise<void> | null;
};

function getPageBounds(page: number, itemsPerPage: number) {
  const startIndex = Math.max(0, (page - 1) * itemsPerPage);
  return { startIndex, endIndex: startIndex + itemsPerPage };
}

function countAvailable<T>(items: T[], isAvailable: (item: T) => boolean) {
  return items.filter((item) => isAvailable(item)).length;
}

export function createFeedSnapshotStore<T>(ttlMs = DEFAULT_FEED_TTL_MS) {
  const snapshotEntries = new Map<string, { items: T[]; createdAt: number }>();

  function cleanupExpiredEntries(now: number) {
    for (const [key, entry] of snapshotEntries) {
      if (now - entry.createdAt >= ttlMs) {
        snapshotEntries.delete(key);
      }
    }
  }

  function createFeedSnapshot(id: string, items: T[]) {
    function getPage(page: number, itemsPerPage = 20): FeedPage<T> {
      const { startIndex, endIndex } = getPageBounds(page, itemsPerPage);
      const totalPages = Math.ceil(items.length / itemsPerPage);
      const pageItems = items.slice(startIndex, endIndex);

      return { items: pageItems, page, totalPages };
    }

    return { id, items, getPage };
  }

  function getSnapshot(feedId: string | undefined) {
    if (!isDefined(feedId)) {
      return null;
    }

    const now = Date.now();
    const existingEntry = snapshotEntries.get(feedId);
    if (existingEntry && now - existingEntry.createdAt < ttlMs) {
      return createFeedSnapshot(feedId, existingEntry.items);
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
    return createFeedSnapshot(snapshotId, items);
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
  maxPages = 10,
) {
  const feeds = new Map<string, DiscoveryFeed<T>>();

  function cleanupExpiredEntries(now: number) {
    for (const [key, feed] of feeds) {
      if (now - feed.createdAt >= ttlMs) {
        feeds.delete(key);
      }
    }
  }

  function getOrCreateFeed(feedId: string | undefined) {
    const now = Date.now();
    cleanupExpiredEntries(now);

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
      nextPage: 1,
      pagesFetched: 0,
      exhausted: false,
      createdAt: now,
      pending: null,
    };
    feeds.set(id, feed);
    return { id, feed };
  }

  async function fill(
    feed: DiscoveryFeed<T>,
    requiredItems: number,
    fetchPage: (page: number) => Promise<T[]>,
    isAvailable: (item: T) => boolean,
  ) {
    while (
      !feed.exhausted &&
      feed.pagesFetched < maxPages &&
      countAvailable(feed.items, isAvailable) < requiredItems
    ) {
      // oxlint-disable-next-line no-await-in-loop
      const items = await fetchPage(feed.nextPage);
      feed.nextPage += 1;
      feed.pagesFetched += 1;

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
    }

    if (feed.pagesFetched >= maxPages) {
      feed.exhausted = true;
    }
  }

  async function getPage(
    feedId: string | undefined,
    page: number,
    itemsPerPage: number,
    fetchPage: (page: number) => Promise<T[]>,
    isAvailable: (item: T) => boolean,
  ) {
    const { id, feed } = getOrCreateFeed(feedId);
    const requiredItems = page * itemsPerPage;

    if (feed.pending) {
      await feed.pending;
    }
    if (!feed.exhausted && countAvailable(feed.items, isAvailable) < requiredItems) {
      feed.pending = fill(feed, requiredItems, fetchPage, isAvailable);
      try {
        await feed.pending;
      } finally {
        feed.pending = null;
      }
    }

    const availableItems = feed.items.filter(isAvailable);
    const { startIndex, endIndex } = getPageBounds(page, itemsPerPage);
    return {
      id,
      items: availableItems.slice(startIndex, endIndex),
    };
  }

  return { getPage };
}
