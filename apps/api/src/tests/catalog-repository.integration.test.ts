import SqlDatabase from 'better-sqlite3';
import { describe, it, expect, beforeEach, afterEach } from 'vite-plus/test';

import {
  upsertCatalogCache,
  getAllCatalogCache,
  getCatalogCacheBatch,
  cleanupCatalogCache,
  listCatalogItemsMissingKeywords,
  updateCatalogKeywords,
} from '../catalog/repository.js';
import { createDatabase } from '../db/service.js';
import type { Database } from '../db/service.js';
import { createTestMedia } from './helpers/testHelper.js';

describe('catalog repository - integration tests', () => {
  let db: Database;
  let sqliteDb: SqlDatabase.Database;

  beforeEach(() => {
    const result = createDatabase(':memory:');
    db = result.db;
    sqliteDb = result.sqliteDb;
  });

  afterEach(() => {
    sqliteDb.close();
  });

  describe('upsertCatalogCache', () => {
    it('should insert new items into catalog cache', async () => {
      const items = [
        createTestMedia({ tmdbId: 1, type: 'movie', name: 'Movie 1' }),
        createTestMedia({ tmdbId: 2, type: 'tv', name: 'TV Show 1' }),
      ];

      await upsertCatalogCache(db, items);

      const cached = await getAllCatalogCache(db);
      expect(cached).toHaveLength(2);
      expect(cached[0]?.tmdbId).toBe(1);
      expect(cached[1]?.tmdbId).toBe(2);
    });

    it('should update existing items without overwriting keywords', async () => {
      // Insert initial item with keywords
      const withKeywords = createTestMedia({
        tmdbId: 1,
        type: 'movie',
        name: 'Original',
        keywords: [{ id: 1, name: 'action' }],
      });
      await upsertCatalogCache(db, [withKeywords]);

      // Update same item without keywords
      const updated = createTestMedia({
        tmdbId: 1,
        type: 'movie',
        name: 'Updated',
      });
      await upsertCatalogCache(db, [updated]);

      const cached = await getAllCatalogCache(db);
      expect(cached).toHaveLength(1);
      expect(cached[0]?.name).toBe('Updated');
      // Keywords should be preserved
      expect(cached[0]?.keywords).toEqual([{ id: 1, name: 'action' }]);
    });

    it('should handle empty array', async () => {
      await upsertCatalogCache(db, []);
      const cached = await getAllCatalogCache(db);
      expect(cached).toHaveLength(0);
    });
  });

  describe('getCatalogCacheBatch', () => {
    it('should return matching items by tmdbId and type', async () => {
      const items = [
        createTestMedia({ tmdbId: 1, type: 'movie' }),
        createTestMedia({ tmdbId: 2, type: 'tv' }),
        createTestMedia({ tmdbId: 3, type: 'movie' }),
      ];
      await upsertCatalogCache(db, items);

      const result = await getCatalogCacheBatch(db, [
        { tmdbId: 1, type: 'movie' },
        { tmdbId: 2, type: 'tv' },
      ]);

      expect(result).toHaveLength(2);
      expect(result[0]?.tmdbId).toBe(1);
      expect(result[1]?.tmdbId).toBe(2);
    });

    it('should return empty array for non-existent items', async () => {
      const result = await getCatalogCacheBatch(db, [{ tmdbId: 999, type: 'movie' }]);
      expect(result).toHaveLength(0);
    });

    it('should handle empty input array', async () => {
      const result = await getCatalogCacheBatch(db, []);
      expect(result).toHaveLength(0);
    });
  });

  describe('getAllCatalogCache', () => {
    it('should return all cached items', async () => {
      const items = [
        createTestMedia({ tmdbId: 1, type: 'movie' }),
        createTestMedia({ tmdbId: 2, type: 'tv' }),
        createTestMedia({ tmdbId: 3, type: 'movie' }),
      ];
      await upsertCatalogCache(db, items);

      const result = await getAllCatalogCache(db);
      expect(result).toHaveLength(3);
    });

    it('should return empty array when cache is empty', async () => {
      const result = await getAllCatalogCache(db);
      expect(result).toHaveLength(0);
    });
  });

  describe('cleanupCatalogCache', () => {
    it('should delete items not in the current list', async () => {
      const items = [
        createTestMedia({ tmdbId: 1, type: 'movie' }),
        createTestMedia({ tmdbId: 2, type: 'tv' }),
        createTestMedia({ tmdbId: 3, type: 'movie' }),
      ];
      await upsertCatalogCache(db, items);

      // Keep only items 1 and 2
      const deletedCount = await cleanupCatalogCache(db, [
        { tmdbId: 1, type: 'movie' },
        { tmdbId: 2, type: 'tv' },
      ]);

      expect(deletedCount).toBe(1);

      const remaining = await getAllCatalogCache(db);
      expect(remaining).toHaveLength(2);
      expect(remaining.find((m) => m.tmdbId === 3)).toBeUndefined();
    });

    it('should delete all items when empty list provided', async () => {
      const items = [
        createTestMedia({ tmdbId: 1, type: 'movie' }),
        createTestMedia({ tmdbId: 2, type: 'tv' }),
      ];
      await upsertCatalogCache(db, items);

      const deletedCount = await cleanupCatalogCache(db, []);

      expect(deletedCount).toBe(2);

      const remaining = await getAllCatalogCache(db);
      expect(remaining).toHaveLength(0);
    });

    it('should return 0 when no items to delete', async () => {
      const items = [createTestMedia({ tmdbId: 1, type: 'movie' })];
      await upsertCatalogCache(db, items);

      const deletedCount = await cleanupCatalogCache(db, [{ tmdbId: 1, type: 'movie' }]);

      expect(deletedCount).toBe(0);
    });
  });

  describe('listCatalogItemsMissingKeywords', () => {
    it('should return items without keywords', async () => {
      const itemsWithoutKeywords = [
        createTestMedia({ tmdbId: 1, type: 'movie' }),
        createTestMedia({ tmdbId: 2, type: 'tv' }),
      ];
      const itemWithKeywords = createTestMedia({
        tmdbId: 3,
        type: 'movie',
        keywords: [{ id: 1, name: 'action' }],
      });

      await upsertCatalogCache(db, [...itemsWithoutKeywords, itemWithKeywords]);

      const result = await listCatalogItemsMissingKeywords(db);

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.tmdbId).sort()).toEqual([1, 2]);
    });

    it('should return empty array when all items have keywords', async () => {
      const items = [
        createTestMedia({ tmdbId: 1, type: 'movie', keywords: [{ id: 1, name: 'action' }] }),
        createTestMedia({ tmdbId: 2, type: 'tv', keywords: [{ id: 2, name: 'drama' }] }),
      ];
      await upsertCatalogCache(db, items);

      const result = await listCatalogItemsMissingKeywords(db);
      expect(result).toHaveLength(0);
    });
  });

  describe('updateCatalogKeywords', () => {
    it('should update keywords for a specific item', async () => {
      const item = createTestMedia({ tmdbId: 1, type: 'movie' });
      await upsertCatalogCache(db, [item]);

      const keywords = [
        { id: 1, name: 'action' },
        { id: 2, name: 'adventure' },
      ];
      await updateCatalogKeywords(db, 1, 'movie', keywords);

      const cached = await getAllCatalogCache(db);
      expect(cached[0]?.keywords).toEqual(keywords);
    });

    it('should only update the matching item', async () => {
      const items = [
        createTestMedia({ tmdbId: 1, type: 'movie' }),
        createTestMedia({ tmdbId: 2, type: 'tv' }),
      ];
      await upsertCatalogCache(db, items);

      const keywords = [{ id: 1, name: 'action' }];
      await updateCatalogKeywords(db, 1, 'movie', keywords);

      const cached = await getAllCatalogCache(db);
      const updated = cached.find((m) => m.tmdbId === 1);
      const unchanged = cached.find((m) => m.tmdbId === 2);

      expect(updated?.keywords).toEqual(keywords);
      expect(unchanged?.keywords).toBeUndefined();
    });
  });
});
