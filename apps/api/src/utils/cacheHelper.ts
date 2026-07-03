/**
 * Create a simple in-memory time-to-live (TTL) cache.
 * Entries expire after `ttlMs`; expired reads return undefined and evict the key.
 * When `maxEntries` is set, the least-recently-used entry is evicted once the
 * limit is exceeded, keeping memory bounded even if keys are never re-read.
 */
export function createLruTtlCache<T>(ttlMs: number, maxEntries: number) {
  const store = new Map<string, { expiresAt: number; value: T }>();

  function get(key: string): T | undefined {
    const entry = store.get(key);
    if (!entry) {
      return undefined;
    }

    store.delete(key);

    if (entry.expiresAt <= Date.now()) {
      return undefined;
    }

    store.set(key, entry);
    return entry.value;
  }

  function set(key: string, value: T): void {
    store.delete(key);
    store.set(key, { expiresAt: Date.now() + ttlMs, value });

    if (store.size > maxEntries) {
      const oldestKey = store.keys().next().value;
      if (oldestKey !== undefined) {
        store.delete(oldestKey);
      }
    }
  }

  async function getOrLoad(key: string, load: () => Promise<T>): Promise<T> {
    const cached = get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await load();
    set(key, value);
    return value;
  }

  function clear(): void {
    store.clear();
  }

  return { get, set, getOrLoad, clear };
}
