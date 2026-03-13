import type { Media } from '@findarr/shared';
import SqlDatabase from 'better-sqlite3';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDatabase, type DB } from '../db/setup.js';
import { createTestMedia as createMediaTestHelper } from '../utils/testHelper.js';
import {
  getMediaById,
  getMediaByTmdbId,
  createMedia,
  updateMediaStatus,
  getMediaRecordsBatch,
  type MediaDbRow,
} from './repository.js';

describe('mediaRepository', () => {
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

  describe('createMedia', () => {
    it('should create a new media record', async () => {
      const media = await createMedia(db, 123, 'movie');

      expect(media.id).toBe(1);

      expect(media).toMatchObject({
        id: 1,
        tmdbId: 123,
        type: 'movie',
        status: 'pending',
        jellyfinId: null,
      });
    });

    it('should use default status of pending', async () => {
      const media = await createMedia(db, 456, 'tv');
      expect(media?.status).toBe('pending');
    });

    it('should allow custom status', async () => {
      const media = await createMedia(db, 789, 'movie', 'available');
      expect(media?.status).toBe('available');
    });
  });

  describe('getMediaById', () => {
    it('should return media by id', async () => {
      const mediaId = (await createMedia(db, 123, 'movie')).id;
      const media = await getMediaById(db, mediaId);

      expect(media).toMatchObject({
        id: mediaId,
        tmdbId: 123,
        type: 'movie',
      });
    });

    it('should return undefined for non-existent id', async () => {
      const media = await getMediaById(db, 999);

      expect(media).toBeUndefined();
    });
  });

  describe('getMediaByTmdbId', () => {
    it('should return media by tmdbId and type', async () => {
      await createMedia(db, 123, 'movie');

      const media = await getMediaByTmdbId(db, 123, 'movie');

      expect(media).toMatchObject({
        tmdbId: 123,
        type: 'movie',
      });
    });

    it('should return undefined for non-existent tmdbId', async () => {
      const media = await getMediaByTmdbId(db, 999, 'movie');

      expect(media).toBeUndefined();
    });

    it('should distinguish between movie and tv with same tmdbId', async () => {
      await createMedia(db, 123, 'movie');
      await createMedia(db, 123, 'tv');

      const movie = await getMediaByTmdbId(db, 123, 'movie');
      const tv = await getMediaByTmdbId(db, 123, 'tv');

      expect(movie?.type).toBe('movie');
      expect(tv?.type).toBe('tv');
      expect(movie?.id).not.toBe(tv?.id);
    });
  });

  describe('updateMediaStatus', () => {
    it('should update media status', async () => {
      const newMedia = await createMedia(db, 123, 'movie', 'requested');

      await updateMediaStatus(db, newMedia.id, 'available');

      const media = await getMediaById(db, newMedia.id);
      expect(media?.status).toBe('available');
    });

    it('should update timestamp when status changes', async () => {
      const media = await createMedia(db, 123, 'movie');
      const originalMedia = (await getMediaById(db, media.id)) as MediaDbRow;

      await updateMediaStatus(db, media.id, 'available');

      const updatedMedia = (await getMediaById(db, media.id)) as MediaDbRow;
      expect(updatedMedia.updatedAt).toBeGreaterThanOrEqual(originalMedia.createdAt);
      expect(updatedMedia.status).toBe('available');
    });

    it('should throw NotFound for non-existent media', async () => {
      await expect(async () => {
        await updateMediaStatus(db, 999, 'available');
      }).rejects.toThrow('Media not found');
    });
  });

  describe('getMediaRecordsBatch', () => {
    it('should return empty map for empty input', async () => {
      const result = await getMediaRecordsBatch(db, []);
      expect(result.size).toBe(0);
    });

    it('should fetch media records for multiple media items', async () => {
      // Create some database records
      await createMedia(db, 123, 'movie', 'requested');
      await createMedia(db, 456, 'tv', 'available');

      const mediaItems: Media[] = [
        createMediaTestHelper({ tmdbId: 123, type: 'movie' }),
        createMediaTestHelper({ tmdbId: 456, type: 'tv' }),
      ];

      const result = await getMediaRecordsBatch(db, mediaItems);

      expect(result.size).toBe(2);
      expect(result.get('123_movie')).toMatchObject({
        id: 1,
        status: 'requested',
        jellyfinId: null,
      });
      expect(result.get('456_tv')).toMatchObject({
        id: 2,
        status: 'available',
        jellyfinId: null,
      });
    });

    it('should only return records that exist in database', async () => {
      await createMedia(db, 123, 'movie', 'requested');

      const mediaItems: Media[] = [
        createMediaTestHelper({ tmdbId: 123, type: 'movie' }),
        createMediaTestHelper({ tmdbId: 999, type: 'tv' }), // Doesn't exist in DB
      ];

      const result = await getMediaRecordsBatch(db, mediaItems);

      expect(result.size).toBe(1);
      expect(result.get('123_movie')).toBeDefined();
      expect(result.get('999_tv')).toBeUndefined();
    });

    it('should handle media with same tmdbId but different types', async () => {
      await createMedia(db, 123, 'movie', 'requested');
      await createMedia(db, 123, 'tv', 'available');

      const mediaItems: Media[] = [
        createMediaTestHelper({ tmdbId: 123, type: 'movie' }),
        createMediaTestHelper({ tmdbId: 123, type: 'tv' }),
      ];

      const result = await getMediaRecordsBatch(db, mediaItems);

      expect(result.size).toBe(2);
      expect(result.get('123_movie')?.status).toBe('requested');
      expect(result.get('123_tv')?.status).toBe('available');
    });

    it('should include all record fields', async () => {
      const media = await createMedia(db, 123, 'movie', 'available');

      // Update jellyfinId
      sqliteDb.prepare('UPDATE media SET jellyfinId = ? WHERE id = ?').run('jf-abc-123', media.id);

      const mediaItems: Media[] = [createMediaTestHelper({ tmdbId: 123, type: 'movie' })];

      const result = await getMediaRecordsBatch(db, mediaItems);
      const record = result.get('123_movie');

      expect(record).toMatchObject({
        id: 1,
        status: 'available',
        jellyfinId: 'jf-abc-123',
      });
      expect(record?.createdAt).toBeDefined();
      expect(record?.updatedAt).toBeDefined();
    });
  });
});
