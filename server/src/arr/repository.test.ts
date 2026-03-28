import { media } from '@findarr/shared';
import SqlDatabase from 'better-sqlite3';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDatabase, type DB } from '../db/setup.js';
import { createMedia } from '../media/repository.js';
import {
  updateMediaIds,
  getMediaWithoutTmdbId,
  upsertMediaFromArr,
  batchUpdateMediaStatus,
  getMediaWithArrIds,
  clearRemovedArrItems,
} from './repository.js';

describe('arr repository', () => {
  let db: DB;
  let sqliteDb: SqlDatabase.Database;

  beforeEach(() => {
    const result = createDatabase(':memory:');
    db = result.db;
    sqliteDb = result.sqliteDb;
  });

  afterEach(() => {
    sqliteDb.close();
  });

  describe('updateMediaIds', () => {
    it('should update arr ID for a movie', async () => {
      const media = await createMedia(db, 123, 'movie');

      await updateMediaIds(db, media.id, { arrId: 456 });

      const updated = await db.query.media.findFirst({ where: (m, { eq }) => eq(m.id, media.id) });
      expect(updated?.arrId).toBe(456);
    });

    it('should update arr and tvdb IDs for a TV show', async () => {
      const media = await createMedia(db, 456, 'tv');

      await updateMediaIds(db, media.id, { arrId: 789, tvdbId: 81_189 });

      const updated = await db.query.media.findFirst({ where: (m, { eq }) => eq(m.id, media.id) });
      expect(updated?.arrId).toBe(789);
      expect(updated?.tvdbId).toBe(81_189);
    });

    it('should update updatedAt timestamp', async () => {
      const media = await createMedia(db, 123, 'movie');
      const initialUpdatedAt = media.updatedAt;

      // Wait a bit to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10));

      await updateMediaIds(db, media.id, { arrId: 456 });

      const updated = await db.query.media.findFirst({ where: (m, { eq }) => eq(m.id, media.id) });
      expect(updated?.updatedAt).toBeGreaterThan(initialUpdatedAt);
    });

    it('should filter out undefined values', async () => {
      const media = await createMedia(db, 123, 'movie');

      await updateMediaIds(db, media.id, { tvdbId: 999 });

      const updated = await db.query.media.findFirst({ where: (m, { eq }) => eq(m.id, media.id) });
      expect(updated?.arrId).toBeNull();
      expect(updated?.tvdbId).toBe(999);
    });
  });

  describe('getMediaWithoutTmdbId', () => {
    it('should return TV shows without TMDB ID', async () => {
      // Create TV show with tvdbId but no tmdbId (from Sonarr)
      await db.insert(media).values({
        type: 'tv',
        tmdbId: null,
        tvdbId: 123,
        status: 'pending',
      });

      await createMedia(db, 456, 'movie'); // Movie, should be excluded

      // Create TV show with both tmdbId and tvdbId (already enriched)
      await db.insert(media).values({
        type: 'tv',
        tmdbId: 789,
        tvdbId: 999,
        status: 'pending',
      });

      const result = await getMediaWithoutTmdbId(db);

      expect(result).toHaveLength(1);
      expect(result[0]?.tvdbId).toBe(123);
      expect(result[0]?.type).toBe('tv');
    });

    it('should return empty array when all TV shows have TMDB IDs', async () => {
      const media = await createMedia(db, 123, 'tv');
      await updateMediaIds(db, media.id, { tmdbId: 789 });

      const result = await getMediaWithoutTmdbId(db);

      expect(result).toHaveLength(0);
    });
  });

  describe('upsertMediaFromArr', () => {
    it('should insert new media from Radarr', async () => {
      await upsertMediaFromArr(db, [
        { type: 'movie', tvdbId: null, tmdbId: 123, arrId: 456, status: 'available' },
      ]);

      const media = await db.query.media.findFirst({
        where: (m, { eq, and }) => and(eq(m.tmdbId, 123), eq(m.type, 'movie')),
      });

      expect(media?.arrId).toBe(456);
      expect(media?.status).toBe('available');
    });

    it('should insert new media from Sonarr', async () => {
      await upsertMediaFromArr(db, [
        { type: 'tv', tvdbId: 81_189, tmdbId: null, arrId: 789, status: 'available' },
      ]);

      const media = await db.query.media.findFirst({
        where: (m, { eq, and }) => and(eq(m.tvdbId, 81_189), eq(m.type, 'tv')),
      });

      expect(media?.tvdbId).toBe(81_189);
      expect(media?.arrId).toBe(789);
      expect(media?.status).toBe('available');
    });

    it('should update existing media on conflict', async () => {
      // Create initial record (simulating a previous Radarr sync)
      await db.insert(media).values({
        type: 'movie',
        tmdbId: 123,
        status: 'pending',
      });

      await upsertMediaFromArr(db, [
        { type: 'movie', tvdbId: null, tmdbId: 123, arrId: 456, status: 'available' },
      ]);

      const mediaRecord = await db.query.media.findFirst({
        where: (m, { eq, and }) => and(eq(m.tmdbId, 123), eq(m.type, 'movie')),
      });

      expect(mediaRecord?.arrId).toBe(456);
      expect(mediaRecord?.status).toBe('available');
    });

    it('should handle batch upsert', async () => {
      await upsertMediaFromArr(db, [
        { type: 'movie', tvdbId: null, tmdbId: 123, arrId: 1, status: 'available' },
        { type: 'movie', tvdbId: null, tmdbId: 456, arrId: 2, status: 'available' },
        { type: 'tv', tvdbId: 81_189, tmdbId: null, arrId: 3, status: 'available' },
      ]);

      const movies = await db.query.media.findMany({
        where: (m, { eq }) => eq(m.type, 'movie'),
      });

      const tvShows = await db.query.media.findMany({
        where: (m, { eq }) => eq(m.type, 'tv'),
      });

      expect(movies).toHaveLength(2);
      expect(tvShows).toHaveLength(1);
    });

    it('should handle empty array', async () => {
      await upsertMediaFromArr(db, []);

      const media = await db.query.media.findMany();
      expect(media).toHaveLength(0);
    });
  });

  describe('batchUpdateMediaStatus', () => {
    it('should update status by arr ID for movie', async () => {
      const media = await createMedia(db, 123, 'movie');
      await updateMediaIds(db, media.id, { arrId: 456 });

      await batchUpdateMediaStatus(db, [{ arrId: 456, status: 'downloading' }]);

      const updated = await db.query.media.findFirst({ where: (m, { eq }) => eq(m.id, media.id) });
      expect(updated?.status).toBe('downloading');
    });

    it('should update status by arr ID for TV show', async () => {
      const media = await createMedia(db, 456, 'tv');
      await updateMediaIds(db, media.id, { arrId: 789 });

      await batchUpdateMediaStatus(db, [{ arrId: 789, status: 'downloading' }]);

      const updated = await db.query.media.findFirst({ where: (m, { eq }) => eq(m.id, media.id) });
      expect(updated?.status).toBe('downloading');
    });

    it('should handle batch updates', async () => {
      const media1 = await createMedia(db, 123, 'movie');
      await updateMediaIds(db, media1.id, { arrId: 1 });

      const media2 = await createMedia(db, 456, 'tv');
      await updateMediaIds(db, media2.id, { arrId: 2 });

      await batchUpdateMediaStatus(db, [
        { arrId: 1, status: 'downloaded' },
        { arrId: 2, status: 'downloading' },
      ]);

      const updated1 = await db.query.media.findFirst({
        where: (m, { eq }) => eq(m.id, media1.id),
      });
      const updated2 = await db.query.media.findFirst({
        where: (m, { eq }) => eq(m.id, media2.id),
      });

      expect(updated1?.status).toBe('downloaded');
      expect(updated2?.status).toBe('downloading');
    });
  });

  describe('getMediaWithArrIds', () => {
    it('should return all media with arr information', async () => {
      const media1 = await createMedia(db, 123, 'movie');
      await updateMediaIds(db, media1.id, { arrId: 456 });

      const media2 = await createMedia(db, 789, 'tv');
      await updateMediaIds(db, media2.id, { arrId: 101, tvdbId: 81_189 });

      const result = await getMediaWithArrIds(db);

      expect(result).toHaveLength(2);
      expect(result.some(m => m.arrId === 456)).toBe(true);
      expect(result.some(m => m.arrId === 101)).toBe(true);
    });

    it('should return empty array when no media exists', async () => {
      const result = await getMediaWithArrIds(db);
      expect(result).toHaveLength(0);
    });
  });

  describe('clearRemovedArrItems', () => {
    it('should clear arr ID from removed movies', async () => {
      const media = await createMedia(db, 123, 'movie', 'available');
      await updateMediaIds(db, media.id, { arrId: 456 });

      const cleared = await clearRemovedArrItems(db, [456], 'movie');

      const updated = await db.query.media.findFirst({ where: (m, { eq }) => eq(m.id, media.id) });
      expect(updated?.arrId).toBeNull();
      expect(updated?.status).toBe('available'); // Should preserve available status
      expect(cleared).toBe(1);
    });

    it('should set status to pending for non-available media', async () => {
      const media = await createMedia(db, 123, 'movie', 'requested');
      await updateMediaIds(db, media.id, { arrId: 456 });

      await clearRemovedArrItems(db, [456], 'movie');

      const updated = await db.query.media.findFirst({ where: (m, { eq }) => eq(m.id, media.id) });
      expect(updated?.arrId).toBeNull();
      expect(updated?.status).toBe('pending');
    });

    it('should handle multiple IDs', async () => {
      const media1 = await createMedia(db, 123, 'movie');
      await updateMediaIds(db, media1.id, { arrId: 1 });

      const media2 = await createMedia(db, 456, 'movie');
      await updateMediaIds(db, media2.id, { arrId: 2 });

      const cleared = await clearRemovedArrItems(db, [1, 2], 'movie');

      expect(cleared).toBe(2);
    });

    it('should handle empty array', async () => {
      const cleared = await clearRemovedArrItems(db, [], 'movie');
      expect(cleared).toBe(0);
    });
  });

  describe('clearRemovedArrItems (TV)', () => {
    it('should clear arr ID from removed TV shows', async () => {
      const media = await createMedia(db, 456, 'tv', 'available');
      await updateMediaIds(db, media.id, { arrId: 789 });

      const cleared = await clearRemovedArrItems(db, [789], 'tv');

      const updated = await db.query.media.findFirst({ where: (m, { eq }) => eq(m.id, media.id) });
      expect(updated?.arrId).toBeNull();
      expect(updated?.status).toBe('available');
      expect(cleared).toBe(1);
    });

    it('should set status to pending for non-available media', async () => {
      const media = await createMedia(db, 456, 'tv', 'downloading');
      await updateMediaIds(db, media.id, { arrId: 789 });

      await clearRemovedArrItems(db, [789], 'tv');

      const updated = await db.query.media.findFirst({ where: (m, { eq }) => eq(m.id, media.id) });
      expect(updated?.arrId).toBeNull();
      expect(updated?.status).toBe('pending');
    });

    it('should handle empty array', async () => {
      const cleared = await clearRemovedArrItems(db, [], 'tv');
      expect(cleared).toBe(0);
    });
  });
});
