import SqlDatabase from 'better-sqlite3';
import { describe, it, expect, beforeEach } from 'vitest';
import type { DB } from '../db/setup.js';
import {
  getMediaById,
  getMediaByTmdbId,
  createMedia,
  updateMediaStatus,
  type MediaDbRow,
} from './media.js';

// Schema for in-memory database
const SCHEMA = `
CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tmdbId INTEGER NOT NULL,
  mediaType TEXT NOT NULL CHECK(mediaType IN ('movie', 'tv')),
  jellyfinId TEXT,
  status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'available', 'rejected')) DEFAULT 'pending',
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
      const mediaId = createMedia(db, 123, 'movie', 'pending');

      expect(mediaId).toBe(1);

      const media = getMediaById(db, mediaId);
      expect(media).toMatchObject({
        id: 1,
        tmdbId: 123,
        mediaType: 'movie',
        status: 'pending',
        jellyfinId: null,
      });
    });

    it('should use default status of pending', () => {
      const mediaId = createMedia(db, 456, 'tv');

      const media = getMediaById(db, mediaId);
      expect(media?.status).toBe('pending');
    });

    it('should allow custom status', () => {
      const mediaId = createMedia(db, 789, 'movie', 'available');

      const media = getMediaById(db, mediaId);
      expect(media?.status).toBe('available');
    });
  });

  describe('getMediaById', () => {
    it('should return media by id', () => {
      const mediaId = createMedia(db, 123, 'movie');

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
      const mediaId = createMedia(db, 123, 'movie', 'pending');

      updateMediaStatus(db, mediaId, 'approved');

      const media = getMediaById(db, mediaId);
      expect(media?.status).toBe('approved');
    });

    it('should update timestamp when status changes', () => {
      const mediaId = createMedia(db, 123, 'movie');
      const originalMedia = getMediaById(db, mediaId) as MediaDbRow;

      updateMediaStatus(db, mediaId, 'approved');

      const updatedMedia = getMediaById(db, mediaId) as MediaDbRow;
      expect(updatedMedia.updatedAt).toBeGreaterThanOrEqual(originalMedia.createdAt);
      expect(updatedMedia.status).toBe('approved');
    });

    it('should throw NotFound for non-existent media', () => {
      expect(() => {
        updateMediaStatus(db, 999, 'approved');
      }).toThrow('Media not found');
    });
  });
});
