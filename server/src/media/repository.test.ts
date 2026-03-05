import type { Media } from '@findarr/shared';
import SqlDatabase from 'better-sqlite3';
import { describe, it, expect, beforeEach } from 'vitest';
import type { DB } from '../db/setup.js';
import { createMedia as createMediaTestHelper } from '../utils/testHelper.js';
import {
  getMediaById,
  getMediaByTmdbId,
  createMedia,
  updateMediaStatus,
  getMediaRecordsBatch,
  type MediaDbRow,
} from './repository.js';

// Schema for in-memory database
const SCHEMA = `
CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tmdbId INTEGER NOT NULL,
  mediaType TEXT NOT NULL CHECK(mediaType IN ('movie', 'tv')),
  jellyfinId TEXT,
  status TEXT NOT NULL CHECK(status IN ('pending', 'requested', 'available')) DEFAULT 'pending',
  createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
  updatedAt INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(tmdbId, mediaType)
);
`;

describe('mediaRepository', () => {
  let db: DB;

  beforeEach(() => {
    db = new SqlDatabase(':memory:');
    db.pragma('foreign_keys = ON');
    db.exec(SCHEMA);
  });

  describe('createMedia', () => {
    it('should create a new media record', () => {
      const media = createMedia(db, 123, 'movie');

      expect(media.id).toBe(1);

      expect(media).toMatchObject({
        id: 1,
        tmdbId: 123,
        mediaType: 'movie',
        status: 'pending',
        jellyfinId: null,
      });
    });

    it('should use default status of pending', () => {
      const media = createMedia(db, 456, 'tv');
      expect(media?.status).toBe('pending');
    });

    it('should allow custom status', () => {
      const media = createMedia(db, 789, 'movie', 'available');
      expect(media?.status).toBe('available');
    });
  });

  describe('getMediaById', () => {
    it('should return media by id', () => {
      const mediaId = createMedia(db, 123, 'movie').id;
      const media = getMediaById(db, mediaId);

      expect(media).toMatchObject({
        id: mediaId,
        tmdbId: 123,
        mediaType: 'movie',
      });
    });

    it('should return undefined for non-existent id', () => {
      const media = getMediaById(db, 999);

      expect(media).toBeUndefined();
    });
  });

  describe('getMediaByTmdbId', () => {
    it('should return media by tmdbId and type', () => {
      createMedia(db, 123, 'movie');

      const media = getMediaByTmdbId(db, 123, 'movie');

      expect(media).toMatchObject({
        tmdbId: 123,
        mediaType: 'movie',
      });
    });

    it('should return undefined for non-existent tmdbId', () => {
      const media = getMediaByTmdbId(db, 999, 'movie');

      expect(media).toBeUndefined();
    });

    it('should distinguish between movie and tv with same tmdbId', () => {
      createMedia(db, 123, 'movie');
      createMedia(db, 123, 'tv');

      const movie = getMediaByTmdbId(db, 123, 'movie');
      const tv = getMediaByTmdbId(db, 123, 'tv');

      expect(movie?.mediaType).toBe('movie');
      expect(tv?.mediaType).toBe('tv');
      expect(movie?.id).not.toBe(tv?.id);
    });
  });

  describe('updateMediaStatus', () => {
    it('should update media status', () => {
      const newMedia = createMedia(db, 123, 'movie', 'requested');

      updateMediaStatus(db, newMedia.id, 'available');

      const media = getMediaById(db, newMedia.id);
      expect(media?.status).toBe('available');
    });

    it('should update timestamp when status changes', () => {
      const media = createMedia(db, 123, 'movie');
      const originalMedia = getMediaById(db, media.id) as MediaDbRow;

      updateMediaStatus(db, media.id, 'available');

      const updatedMedia = getMediaById(db, media.id) as MediaDbRow;
      expect(updatedMedia.updatedAt).toBeGreaterThanOrEqual(originalMedia.createdAt);
      expect(updatedMedia.status).toBe('available');
    });

    it('should throw NotFound for non-existent media', () => {
      expect(() => {
        updateMediaStatus(db, 999, 'available');
      }).toThrow('Media not found');
    });
  });

  describe('getMediaRecordsBatch', () => {
    it('should return empty map for empty input', () => {
      const result = getMediaRecordsBatch(db, []);
      expect(result.size).toBe(0);
    });

    it('should fetch media records for multiple media items', () => {
      // Create some database records
      createMedia(db, 123, 'movie', 'requested');
      createMedia(db, 456, 'tv', 'available');

      const mediaItems: Media[] = [
        createMediaTestHelper({ id: 123, type: 'movie' }),
        createMediaTestHelper({ id: 456, type: 'tv' }),
      ];

      const result = getMediaRecordsBatch(db, mediaItems);

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

    it('should only return records that exist in database', () => {
      createMedia(db, 123, 'movie', 'requested');

      const mediaItems: Media[] = [
        createMediaTestHelper({ id: 123, type: 'movie' }),
        createMediaTestHelper({ id: 999, type: 'tv' }), // Doesn't exist in DB
      ];

      const result = getMediaRecordsBatch(db, mediaItems);

      expect(result.size).toBe(1);
      expect(result.get('123_movie')).toBeDefined();
      expect(result.get('999_tv')).toBeUndefined();
    });

    it('should handle media with same tmdbId but different types', () => {
      createMedia(db, 123, 'movie', 'requested');
      createMedia(db, 123, 'tv', 'available');

      const mediaItems: Media[] = [
        createMediaTestHelper({ id: 123, type: 'movie' }),
        createMediaTestHelper({ id: 123, type: 'tv' }),
      ];

      const result = getMediaRecordsBatch(db, mediaItems);

      expect(result.size).toBe(2);
      expect(result.get('123_movie')?.status).toBe('requested');
      expect(result.get('123_tv')?.status).toBe('available');
    });

    it('should include all record fields', () => {
      const media = createMedia(db, 123, 'movie', 'available');

      // Update jellyfinId
      db.prepare('UPDATE media SET jellyfinId = ? WHERE id = ?').run('jf-abc-123', media.id);

      const mediaItems: Media[] = [createMediaTestHelper({ id: 123, type: 'movie' })];

      const result = getMediaRecordsBatch(db, mediaItems);
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
