import type { CreateMediaInteraction } from '@findarr/shared';
import SqlDatabase from 'better-sqlite3';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createDatabase, type DB } from '../db/setup.js';
import { getMediaByTmdbId } from '../media/repository.js';
import type { TMDBService } from '../tmdb/service.js';
import {
  assertDefined as expectDefined,
  createTestMedia as createMediaTestHelper,
  createTestUserInDb,
} from '../utils/testHelper.js';
import { hasInteraction, getVoteCounts } from './repository.js';
import {
  createInteraction,
  getUserInteractionsEnriched,
  getAllInteractionsEnriched,
} from './service.js';

const mockInteraction: CreateMediaInteraction = {
  mediaType: 'movie',
  tmdbId: 123,
  action: 'liked',
};

describe('interaction service - integration tests', () => {
  let db: DB;
  let sqliteDb: SqlDatabase.Database;
  let tmdb: TMDBService;

  beforeEach(() => {
    // Create fresh in-memory database for each test
    const result = createDatabase(':memory:');
    db = result.db;
    sqliteDb = result.sqliteDb;

    // Mock TMDB service that returns movie/TV details with genres
    tmdb = {
      loadGenres: vi.fn().mockResolvedValue(undefined),
      search: vi.fn(),
      fetchDiscover: vi.fn(),
      fetchTrending: vi.fn(),
      getGenres: vi.fn(),
      getDetails: vi.fn().mockResolvedValue({
        id: 123,
        type: 'movie',
        name: 'Test Movie',
        genres: [
          { id: 28, name: 'Action' },
          { id: 12, name: 'Adventure' },
        ],
        date: '2024-01-01',
        posterPath: '/test.jpg',
        backdropPath: undefined,
        overview: 'Test overview',
        voteAverage: 7.5,
        voteCount: 1000,
        popularity: 100,
        originalLanguage: 'en',
        originCountry: undefined,
      }),
    } as TMDBService;
  });

  afterEach(() => {
    sqliteDb.close();
  });

  describe('createInteraction', () => {
    it('should create new media and interaction when media does not exist', async () => {
      const user = await createTestUserInDb(db, { email: 'user1@test.com' });
      expectDefined(user);

      const result = await createInteraction(tmdb, db, mockInteraction, user);

      // Verify media was created
      const media = await getMediaByTmdbId(db, 123, 'movie');
      expectDefined(media);
      expect(media.tmdbId).toBe(123);
      expect(media.type).toBe('movie');
      expect(media.status).toBe('pending');

      // Verify interaction was created
      expect(await hasInteraction(db, user.id, media.id, 'liked')).toBe(true);

      // Verify result
      expect(result).toMatchObject({
        tmdbId: 123,
        type: 'movie',
        status: 'pending',
      });
    });

    it('should return undefined if no user provided', async () => {
      const result = await createInteraction(tmdb, db, mockInteraction, undefined);
      expect(result).toBeUndefined();

      // Verify nothing was created
      const media = await getMediaByTmdbId(db, 123, 'movie');
      expect(media).toBeUndefined();
    });

    it('should toggle off existing interaction when clicked again', async () => {
      const user = await createTestUserInDb(db, { email: 'user1@test.com' });
      expectDefined(user);

      // Create initial interaction
      await createInteraction(tmdb, db, mockInteraction, user);

      const media = await getMediaByTmdbId(db, 123, 'movie');
      expectDefined(media);

      // Verify interaction exists
      expect(await hasInteraction(db, user.id, media.id, 'liked')).toBe(true);

      // Toggle off - click the same action again
      await createInteraction(tmdb, db, mockInteraction, user);

      // Verify interaction was removed
      expect(await hasInteraction(db, user.id, media.id, 'liked')).toBe(false);
    });

    it('should switch from dislike to like', async () => {
      const user = await createTestUserInDb(db, { email: 'user1@test.com' });
      expectDefined(user);

      // First dislike
      await createInteraction(tmdb, db, { ...mockInteraction, action: 'disliked' }, user);

      const media = await getMediaByTmdbId(db, 123, 'movie');
      expectDefined(media);

      // Verify dislike exists
      expect(await hasInteraction(db, user.id, media.id, 'disliked')).toBe(true);
      expect(await hasInteraction(db, user.id, media.id, 'liked')).toBe(false);

      // Switch to like
      await createInteraction(tmdb, db, mockInteraction, user);

      // Verify only like exists now
      expect(await hasInteraction(db, user.id, media.id, 'liked')).toBe(true);
      expect(await hasInteraction(db, user.id, media.id, 'disliked')).toBe(false);
    });

    it('should auto-request when 3 users like it', async () => {
      // Create 3 users
      const user1 = await createTestUserInDb(db, {
        email: 'user1@test.com',
        displayName: 'User 1',
      });
      const user2 = await createTestUserInDb(db, {
        email: 'user2@test.com',
        displayName: 'User 2',
      });
      const user3 = await createTestUserInDb(db, {
        email: 'user3@test.com',
        displayName: 'User 3',
      });
      expectDefined(user1);
      expectDefined(user2);
      expectDefined(user3);

      // First two users like
      await createInteraction(tmdb, db, mockInteraction, user1);
      await createInteraction(tmdb, db, mockInteraction, user2);

      let media = await getMediaByTmdbId(db, 123, 'movie');
      expectDefined(media);
      expect(media.status).toBe('pending');

      const votes = await getVoteCounts(db, media.id);
      expect(votes.likes).toBe(2);

      // Third user likes - should trigger auto-request
      await createInteraction(tmdb, db, mockInteraction, user3);

      media = await getMediaByTmdbId(db, 123, 'movie');
      expectDefined(media);
      expect(media.status).toBe('requested');
    });

    it('should auto-request immediately when admin likes', async () => {
      const admin = await createTestUserInDb(db, {
        email: 'admin@test.com',
        displayName: 'Admin User',
        role: 'admin',
      });
      expectDefined(admin);

      await createInteraction(tmdb, db, mockInteraction, admin);

      const media = await getMediaByTmdbId(db, 123, 'movie');
      expectDefined(media);
      expect(media.status).toBe('requested');
    });

    it('should not auto-request when disliking', async () => {
      // Create 3 users
      const user1 = await createTestUserInDb(db, {
        email: 'user1@test.com',
        displayName: 'User 1',
      });
      const user2 = await createTestUserInDb(db, {
        email: 'user2@test.com',
        displayName: 'User 2',
      });
      const user3 = await createTestUserInDb(db, {
        email: 'user3@test.com',
        displayName: 'User 3',
      });
      expectDefined(user1);
      expectDefined(user2);
      expectDefined(user3);

      // Three users dislike
      await createInteraction(tmdb, db, { ...mockInteraction, action: 'disliked' }, user1);
      await createInteraction(tmdb, db, { ...mockInteraction, action: 'disliked' }, user2);
      await createInteraction(tmdb, db, { ...mockInteraction, action: 'disliked' }, user3);

      const media = await getMediaByTmdbId(db, 123, 'movie');
      expectDefined(media);
      expect(media.status).toBe('pending'); // Should still be pending

      const votes = await getVoteCounts(db, media.id);
      expect(votes.likes).toBe(0);
      expect(votes.dislikes).toBe(3);
    });
  });

  describe('getUserInteractionsEnriched', () => {
    it('should return enriched user interactions with TMDB data', async () => {
      const user = await createTestUserInDb(db, { email: 'user1@test.com' });
      expectDefined(user);

      // Create media and interaction
      await createInteraction(tmdb, db, mockInteraction, user);
      await createInteraction(tmdb, db, { mediaType: 'tv', tmdbId: 456, action: 'liked' }, user);

      const mockMedia1 = createMediaTestHelper({ tmdbId: 123, type: 'movie', name: 'Test Movie' });
      const mockMedia2 = createMediaTestHelper({ tmdbId: 456, type: 'tv', name: 'Test Show' });

      const tmdbServiceForTest = {
        getDetails: vi.fn().mockResolvedValueOnce(mockMedia1).mockResolvedValueOnce(mockMedia2),
      } as unknown as TMDBService;

      const result = await getUserInteractionsEnriched(tmdbServiceForTest, db, user.id);

      expect(result).toHaveLength(2);
      // Verify both items are present (order may vary)
      const ids = result.map(r => r.tmdbId);
      expect(ids).toContain(123);
      expect(ids).toContain(456);
      expect(tmdbServiceForTest.getDetails).toHaveBeenCalledTimes(2);
    });

    it('should return empty array if no userId', async () => {
      const tmdbServiceForTest = {} as TMDBService;
      const result = await getUserInteractionsEnriched(tmdbServiceForTest, db, undefined);
      expect(result).toEqual([]);
    });

    it('should return empty array for userId with no interactions', async () => {
      const tmdbServiceForTest = {} as TMDBService;
      const result = await getUserInteractionsEnriched(tmdbServiceForTest, db, 999);
      expect(result).toEqual([]);
    });
  });

  describe('getAllInteractionsEnriched', () => {
    it('should return all enriched interactions from all users', async () => {
      // Create two users
      const user1 = await createTestUserInDb(db, {
        email: 'user1@test.com',
        displayName: 'User 1',
      });
      const user2 = await createTestUserInDb(db, {
        email: 'user2@test.com',
        displayName: 'User 2',
      });

      // Both users interact with the same movie
      await createInteraction(tmdb, db, mockInteraction, user1);
      await createInteraction(tmdb, db, mockInteraction, user2);

      const mockMedia = createMediaTestHelper({ tmdbId: 123, type: 'movie' });

      const tmdbServiceForTest = {
        getDetails: vi.fn().mockResolvedValue(mockMedia),
      } as unknown as TMDBService;

      const result = await getAllInteractionsEnriched(tmdbServiceForTest, db);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ tmdbId: 123, type: 'movie' });
      expect(tmdbServiceForTest.getDetails).toHaveBeenCalledWith({ id: 123, type: 'movie' });
    });

    it('should return empty array if no interactions exist', async () => {
      const tmdbServiceForTest = {} as TMDBService;
      const result = await getAllInteractionsEnriched(tmdbServiceForTest, db);
      expect(result).toEqual([]);
    });

    it('should exclude available media (synced from Jellyfin)', async () => {
      const user = await createTestUserInDb(db, { email: 'user1@test.com' });

      // Create pending media with interaction
      await createInteraction(tmdb, db, mockInteraction, user);

      // Manually insert available media (simulating Jellyfin sync)
      sqliteDb
        .prepare('INSERT INTO media (tmdbId, type, jellyfinId, status) VALUES (?, ?, ?, ?)')
        .run(999, 'movie', 'jellyfin-123', 'available');

      const mockMedia = createMediaTestHelper({ tmdbId: 123, type: 'movie' });
      const tmdbServiceForTest = {
        getDetails: vi.fn().mockResolvedValue(mockMedia),
      } as unknown as TMDBService;

      const result = await getAllInteractionsEnriched(tmdbServiceForTest, db);

      // Should only return the pending media, not the available one
      expect(result).toHaveLength(1);
      expectDefined(result[0]);
      expect(result[0].tmdbId).toBe(123);
    });
  });
});
