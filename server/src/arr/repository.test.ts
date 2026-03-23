import SqlDatabase from 'better-sqlite3';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDatabase, type DB } from '../db/setup.js';
import { createMedia } from '../media/repository.js';
import {
  updateMediaExternalIds,
  getMediaWithoutTvdbId,
  upsertMediaFromArr,
  batchUpdateMediaStatus,
  getMediaWithArrIds,
  clearRemovedRadarrItems,
  clearRemovedSonarrItems,
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

  describe('updateMediaExternalIds', () => {
    it('should update radarr ID for a movie', async () => {
      const media = await createMedia(db, 123, 'movie');

      await updateMediaExternalIds(db, media.id, { radarrId: 456 });

      const updated = await db.query.media.findFirst({ where: (m, { eq }) => eq(m.id, media.id) });
      expect(updated?.radarrId).toBe(456);
    });

    it('should update sonarr and tvdb IDs for a TV show', async () => {
      const media = await createMedia(db, 456, 'tv');

      await updateMediaExternalIds(db, media.id, { sonarrId: 789, tvdbId: 81_189 });

      const updated = await db.query.media.findFirst({ where: (m, { eq }) => eq(m.id, media.id) });
      expect(updated?.sonarrId).toBe(789);
      expect(updated?.tvdbId).toBe(81_189);
    });

    it('should update updatedAt timestamp', async () => {
      const media = await createMedia(db, 123, 'movie');
      const initialUpdatedAt = media.updatedAt;

      // Wait a bit to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10));

      await updateMediaExternalIds(db, media.id, { radarrId: 456 });

      const updated = await db.query.media.findFirst({ where: (m, { eq }) => eq(m.id, media.id) });
      expect(updated?.updatedAt).toBeGreaterThan(initialUpdatedAt);
    });

    it('should filter out undefined values', async () => {
      const media = await createMedia(db, 123, 'movie');

      await updateMediaExternalIds(db, media.id, { tvdbId: 999 });

      const updated = await db.query.media.findFirst({ where: (m, { eq }) => eq(m.id, media.id) });
      expect(updated?.radarrId).toBeNull();
      expect(updated?.tvdbId).toBe(999);
    });
  });

  describe('getMediaWithoutTvdbId', () => {
    it('should return TV shows without TVDB ID', async () => {
      await createMedia(db, 123, 'tv'); // No tvdbId
      await createMedia(db, 456, 'movie'); // Movie, should be excluded

      // Create TV show with tvdbId
      const mediaWithTvdb = await createMedia(db, 789, 'tv');
      await updateMediaExternalIds(db, mediaWithTvdb.id, { tvdbId: 81_189 });

      const result = await getMediaWithoutTvdbId(db);

      expect(result).toHaveLength(1);
      expect(result[0]?.tmdbId).toBe(123);
      expect(result[0]?.type).toBe('tv');
    });

    it('should return empty array when all TV shows have TVDB IDs', async () => {
      const media = await createMedia(db, 123, 'tv');
      await updateMediaExternalIds(db, media.id, { tvdbId: 81_189 });

      const result = await getMediaWithoutTvdbId(db);

      expect(result).toHaveLength(0);
    });
  });

  describe('upsertMediaFromArr', () => {
    it('should insert new media from Radarr', async () => {
      await upsertMediaFromArr(db, [
        { type: 'movie', tmdbId: 123, radarrId: 456, status: 'available' },
      ]);

      const media = await db.query.media.findFirst({
        where: (m, { eq, and }) => and(eq(m.tmdbId, 123), eq(m.type, 'movie')),
      });

      expect(media?.radarrId).toBe(456);
      expect(media?.status).toBe('available');
    });

    it('should insert new media from Sonarr', async () => {
      await upsertMediaFromArr(db, [
        { type: 'tv', tmdbId: 456, tvdbId: 81_189, sonarrId: 789, status: 'available' },
      ]);

      const media = await db.query.media.findFirst({
        where: (m, { eq, and }) => and(eq(m.tmdbId, 456), eq(m.type, 'tv')),
      });

      expect(media?.tvdbId).toBe(81_189);
      expect(media?.sonarrId).toBe(789);
      expect(media?.status).toBe('available');
    });

    it('should update existing media on conflict', async () => {
      await createMedia(db, 123, 'movie', 'pending');

      await upsertMediaFromArr(db, [
        { type: 'movie', tmdbId: 123, radarrId: 456, status: 'available' },
      ]);

      const media = await db.query.media.findFirst({
        where: (m, { eq, and }) => and(eq(m.tmdbId, 123), eq(m.type, 'movie')),
      });

      expect(media?.radarrId).toBe(456);
      expect(media?.status).toBe('available');
    });

    it('should handle batch upsert', async () => {
      await upsertMediaFromArr(db, [
        { type: 'movie', tmdbId: 123, radarrId: 1, status: 'available' },
        { type: 'movie', tmdbId: 456, radarrId: 2, status: 'available' },
        { type: 'tv', tmdbId: 789, tvdbId: 81_189, sonarrId: 3, status: 'available' },
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
    it('should update status by radarr ID', async () => {
      const media = await createMedia(db, 123, 'movie');
      await updateMediaExternalIds(db, media.id, { radarrId: 456 });

      await batchUpdateMediaStatus(db, [{ radarrId: 456, status: 'downloading' }]);

      const updated = await db.query.media.findFirst({ where: (m, { eq }) => eq(m.id, media.id) });
      expect(updated?.status).toBe('downloading');
    });

    it('should update status by sonarr ID', async () => {
      const media = await createMedia(db, 456, 'tv');
      await updateMediaExternalIds(db, media.id, { sonarrId: 789 });

      await batchUpdateMediaStatus(db, [{ sonarrId: 789, status: 'downloading' }]);

      const updated = await db.query.media.findFirst({ where: (m, { eq }) => eq(m.id, media.id) });
      expect(updated?.status).toBe('downloading');
    });

    it('should handle batch updates', async () => {
      const media1 = await createMedia(db, 123, 'movie');
      await updateMediaExternalIds(db, media1.id, { radarrId: 1 });

      const media2 = await createMedia(db, 456, 'tv');
      await updateMediaExternalIds(db, media2.id, { sonarrId: 2 });

      await batchUpdateMediaStatus(db, [
        { radarrId: 1, status: 'downloaded' },
        { sonarrId: 2, status: 'downloading' },
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
      await updateMediaExternalIds(db, media1.id, { radarrId: 456 });

      const media2 = await createMedia(db, 789, 'tv');
      await updateMediaExternalIds(db, media2.id, { sonarrId: 101, tvdbId: 81_189 });

      const result = await getMediaWithArrIds(db);

      expect(result).toHaveLength(2);
      expect(result.some(m => m.radarrId === 456)).toBe(true);
      expect(result.some(m => m.sonarrId === 101)).toBe(true);
    });

    it('should return empty array when no media exists', async () => {
      const result = await getMediaWithArrIds(db);
      expect(result).toHaveLength(0);
    });
  });

  describe('clearRemovedRadarrItems', () => {
    it('should clear radarr ID from removed movies', async () => {
      const media = await createMedia(db, 123, 'movie', 'available');
      await updateMediaExternalIds(db, media.id, { radarrId: 456 });

      const cleared = await clearRemovedRadarrItems(db, [456]);

      const updated = await db.query.media.findFirst({ where: (m, { eq }) => eq(m.id, media.id) });
      expect(updated?.radarrId).toBeNull();
      expect(updated?.status).toBe('available'); // Should preserve available status
      expect(cleared).toBe(1);
    });

    it('should set status to pending for non-available media', async () => {
      const media = await createMedia(db, 123, 'movie', 'requested');
      await updateMediaExternalIds(db, media.id, { radarrId: 456 });

      await clearRemovedRadarrItems(db, [456]);

      const updated = await db.query.media.findFirst({ where: (m, { eq }) => eq(m.id, media.id) });
      expect(updated?.radarrId).toBeNull();
      expect(updated?.status).toBe('pending');
    });

    it('should handle multiple IDs', async () => {
      const media1 = await createMedia(db, 123, 'movie');
      await updateMediaExternalIds(db, media1.id, { radarrId: 1 });

      const media2 = await createMedia(db, 456, 'movie');
      await updateMediaExternalIds(db, media2.id, { radarrId: 2 });

      const cleared = await clearRemovedRadarrItems(db, [1, 2]);

      expect(cleared).toBe(2);
    });

    it('should handle empty array', async () => {
      const cleared = await clearRemovedRadarrItems(db, []);
      expect(cleared).toBe(0);
    });
  });

  describe('clearRemovedSonarrItems', () => {
    it('should clear sonarr ID from removed TV shows', async () => {
      const media = await createMedia(db, 456, 'tv', 'available');
      await updateMediaExternalIds(db, media.id, { sonarrId: 789 });

      const cleared = await clearRemovedSonarrItems(db, [789]);

      const updated = await db.query.media.findFirst({ where: (m, { eq }) => eq(m.id, media.id) });
      expect(updated?.sonarrId).toBeNull();
      expect(updated?.status).toBe('available');
      expect(cleared).toBe(1);
    });

    it('should set status to pending for non-available media', async () => {
      const media = await createMedia(db, 456, 'tv', 'downloading');
      await updateMediaExternalIds(db, media.id, { sonarrId: 789 });

      await clearRemovedSonarrItems(db, [789]);

      const updated = await db.query.media.findFirst({ where: (m, { eq }) => eq(m.id, media.id) });
      expect(updated?.sonarrId).toBeNull();
      expect(updated?.status).toBe('pending');
    });

    it('should handle empty array', async () => {
      const cleared = await clearRemovedSonarrItems(db, []);
      expect(cleared).toBe(0);
    });
  });
});
