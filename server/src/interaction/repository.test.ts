import type { Media } from '@findarr/shared';
import SqlDatabase from 'better-sqlite3';
import type { Statement } from 'better-sqlite3';
import { describe, it, expect, beforeEach, vi, type Mocked } from 'vitest';
import { SCHEMA, type DB } from '../db/setup.js';
import * as mediaRepository from '../media/repository.js';
import { createMedia as createMediaTestHelper } from '../utils/testHelper.js';
import * as interactionRepository from './repository.js';

describe('interaction repository', () => {
  let stmtMock: Mocked<Partial<Statement>>;
  let dbMock: DB;

  beforeEach(() => {
    vi.clearAllMocks();

    stmtMock = {
      run: vi.fn(),
      all: vi.fn(),
      get: vi.fn(),
    };

    dbMock = {
      prepare: vi.fn().mockReturnValue(stmtMock),
      transaction: (fn: () => unknown) => () => fn(),
    } as unknown as DB;
  });

  describe('addInteraction', () => {
    it('should add user interaction', () => {
      interactionRepository.addInteraction(dbMock, 42, 1, 'liked');

      expect(dbMock.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO'));
      expect(stmtMock.run).toHaveBeenCalledWith(42, 1, 'liked');
    });

    it('should handle ON CONFLICT by doing nothing', () => {
      // The SQL has "ON CONFLICT DO NOTHING", so duplicate calls should be idempotent
      interactionRepository.addInteraction(dbMock, 42, 1, 'liked');
      interactionRepository.addInteraction(dbMock, 42, 1, 'liked');

      expect(stmtMock.run).toHaveBeenCalledTimes(2);
    });
  });

  describe('hasInteraction', () => {
    it('should return true when interaction exists', () => {
      stmtMock.get = vi.fn().mockReturnValue({ count: 1 });

      const result = interactionRepository.hasInteraction(dbMock, 42, 1, 'liked');

      expect(result).toBe(true);
      expect(stmtMock.get).toHaveBeenCalledWith(42, 1, 'liked');
    });

    it('should return false when interaction does not exist', () => {
      stmtMock.get = vi.fn().mockReturnValue({ count: 0 });

      const result = interactionRepository.hasInteraction(dbMock, 42, 1, 'liked');

      expect(result).toBe(false);
    });

    it('should return false when query returns undefined', () => {
      stmtMock.get = vi.fn().mockReturnValue(undefined);

      const result = interactionRepository.hasInteraction(dbMock, 42, 1, 'liked');

      expect(result).toBe(false);
    });
  });

  describe('batch queries with real database', () => {
    let realDb: DB;

    // Helper to create a user (raw SQL since createUser is async with password hashing)
    const createUser = (email: string, displayName: string, role: 'user' | 'admin' = 'user') => {
      realDb
        .prepare('INSERT INTO users (email, passwordHash, displayName, role) VALUES (?, ?, ?, ?)')
        .run(email, 'hash', displayName, role);
    };

    beforeEach(() => {
      realDb = new SqlDatabase(':memory:');
      realDb.pragma('foreign_keys = ON');
      realDb.exec(SCHEMA);
    });

    describe('getInteractionsBatch', () => {
      it('should return empty map for empty input', () => {
        const result = interactionRepository.getInteractionsBatch(realDb, [], 1);
        expect(result.size).toBe(0);
      });

      it('should return empty map when media items have no records', () => {
        const mediaItems: Media[] = [createMediaTestHelper({ id: 123, type: 'movie' })];

        const result = interactionRepository.getInteractionsBatch(realDb, mediaItems, 1);
        expect(result.size).toBe(0);
      });

      it('should fetch interactions for user across multiple media items', () => {
        // Setup: Create media records
        const media1 = mediaRepository.createMedia(realDb, 123, 'movie', 'requested');
        const media2 = mediaRepository.createMedia(realDb, 456, 'tv', 'available');

        // Setup: Create user
        createUser('user@example.com', 'User One');

        // Setup: Add interactions
        interactionRepository.addInteraction(realDb, 1, media1.id, 'liked');
        interactionRepository.addInteraction(realDb, 1, media2.id, 'disliked');

        const mediaItems: Media[] = [
          createMediaTestHelper({
            id: 123,
            type: 'movie',
            state: {
              record: {
                id: 1,
                status: 'requested',
                jellyfinId: null,
                createdAt: 1000,
                updatedAt: 1000,
              },
            },
          }),
          createMediaTestHelper({
            id: 456,
            type: 'tv',
            state: {
              record: {
                id: 2,
                status: 'available',
                jellyfinId: null,
                createdAt: 2000,
                updatedAt: 2000,
              },
            },
          }),
        ];

        const result = interactionRepository.getInteractionsBatch(realDb, mediaItems, 1);

        expect(result.size).toBe(2);
        expect(result.get(1)).toHaveLength(1);
        expect(result.get(1)?.[0]?.action).toBe('liked');
        expect(result.get(2)).toHaveLength(1);
        expect(result.get(2)?.[0]?.action).toBe('disliked');
      });

      it('should only return interactions for specified user', () => {
        // Setup: Create media
        const media = mediaRepository.createMedia(realDb, 123, 'movie', 'requested');

        // Setup: Create users
        createUser('user1@example.com', 'User One');
        createUser('user2@example.com', 'User Two');

        // Setup: Add interactions for different users
        interactionRepository.addInteraction(realDb, 1, media.id, 'liked');
        interactionRepository.addInteraction(realDb, 2, media.id, 'liked');

        const mediaItems: Media[] = [
          createMediaTestHelper({
            id: 123,
            type: 'movie',
            state: {
              record: {
                id: 1,
                status: 'requested',
                jellyfinId: null,
                createdAt: 1000,
                updatedAt: 1000,
              },
            },
          }),
        ];

        const resultUser1 = interactionRepository.getInteractionsBatch(realDb, mediaItems, 1);
        const resultUser2 = interactionRepository.getInteractionsBatch(realDb, mediaItems, 2);

        expect(resultUser1.get(1)).toHaveLength(1);
        expect(resultUser1.get(1)?.[0]?.action).toBe('liked');
        expect(resultUser2.get(1)).toHaveLength(1);
        expect(resultUser2.get(1)?.[0]?.action).toBe('liked');
      });
    });

    describe('getAllInteractionsWithUsersBatch', () => {
      it('should return empty map for empty input', () => {
        const result = interactionRepository.getAllInteractionsWithUsersBatch(realDb, []);
        expect(result.size).toBe(0);
      });

      it('should return empty map when media items have no records', () => {
        const mediaItems: Media[] = [createMediaTestHelper({ id: 123, type: 'movie' })];

        const result = interactionRepository.getAllInteractionsWithUsersBatch(realDb, mediaItems);
        expect(result.size).toBe(0);
      });

      it('should fetch all interactions with user info', () => {
        // Setup: Create media
        const media = mediaRepository.createMedia(realDb, 123, 'movie', 'requested');

        // Setup: Create users
        createUser('alice@example.com', 'Alice');
        createUser('bob@example.com', 'Bob', 'admin');

        // Setup: Add interactions
        interactionRepository.addInteraction(realDb, 1, media.id, 'liked');
        interactionRepository.addInteraction(realDb, 2, media.id, 'liked');

        const mediaItems: Media[] = [
          createMediaTestHelper({
            id: 123,
            type: 'movie',
            state: {
              record: {
                id: 1,
                status: 'requested',
                jellyfinId: null,
                createdAt: 1000,
                updatedAt: 1000,
              },
            },
          }),
        ];

        const result = interactionRepository.getAllInteractionsWithUsersBatch(realDb, mediaItems);

        expect(result.size).toBe(1);
        const interactions = result.get(1);
        expect(interactions).toHaveLength(2);

        const aliceInteraction = interactions?.find(i => i.userInfo?.email === 'alice@example.com');
        expect(aliceInteraction).toMatchObject({
          action: 'liked',
          userInfo: {
            id: 1,
            email: 'alice@example.com',
            displayName: 'Alice',
          },
        });

        const bobInteraction = interactions?.find(i => i.userInfo?.email === 'bob@example.com');
        expect(bobInteraction).toMatchObject({
          action: 'liked',
          userInfo: {
            id: 2,
            email: 'bob@example.com',
            displayName: 'Bob',
          },
        });
      });

      it('should order interactions by createdAt DESC', () => {
        // Setup: Create media
        const media = mediaRepository.createMedia(realDb, 123, 'movie', 'requested');

        // Setup: Create users
        createUser('user1@example.com', 'User One');
        createUser('user2@example.com', 'User Two');

        // Setup: Add interactions at different times (SQLite uses unixepoch() by default)
        // We'll insert them manually with specific timestamps
        const time1 = Math.floor(Date.now() / 1000) - 100;
        const time2 = Math.floor(Date.now() / 1000) - 50;
        const time3 = Math.floor(Date.now() / 1000);

        // Note: Using raw SQL here to set custom createdAt timestamps for ordering test
        realDb
          .prepare(
            'INSERT INTO user_media_interactions (userId, mediaId, action, createdAt) VALUES (?, ?, ?, ?)'
          )
          .run(1, media.id, 'liked', time1);
        realDb
          .prepare(
            'INSERT INTO user_media_interactions (userId, mediaId, action, createdAt) VALUES (?, ?, ?, ?)'
          )
          .run(1, media.id, 'disliked', time2);
        realDb
          .prepare(
            'INSERT INTO user_media_interactions (userId, mediaId, action, createdAt) VALUES (?, ?, ?, ?)'
          )
          .run(2, media.id, 'liked', time3); // Different user for second 'liked'

        const mediaItems: Media[] = [
          createMediaTestHelper({
            id: 123,
            type: 'movie',
            state: {
              record: {
                id: 1,
                status: 'requested',
                jellyfinId: null,
                createdAt: 1000,
                updatedAt: 1000,
              },
            },
          }),
        ];

        const result = interactionRepository.getAllInteractionsWithUsersBatch(realDb, mediaItems);
        const interactions = result.get(1);

        expect(interactions).toHaveLength(3);
        // Should be ordered by createdAt DESC (most recent first)
        expect(interactions?.[0]?.action).toBe('liked'); // time3
        expect(interactions?.[1]?.action).toBe('disliked'); // time2
        expect(interactions?.[2]?.action).toBe('liked'); // time1
      });

      it('should handle multiple media items', () => {
        // Setup: Create media
        const media1 = mediaRepository.createMedia(realDb, 123, 'movie', 'requested');
        const media2 = mediaRepository.createMedia(realDb, 456, 'tv', 'available');

        // Setup: Create user
        createUser('user@example.com', 'User');

        // Setup: Add interactions
        interactionRepository.addInteraction(realDb, 1, media1.id, 'liked');
        interactionRepository.addInteraction(realDb, 1, media2.id, 'liked');

        const mediaItems: Media[] = [
          createMediaTestHelper({
            id: 123,
            type: 'movie',
            state: {
              record: {
                id: 1,
                status: 'requested',
                jellyfinId: null,
                createdAt: 1000,
                updatedAt: 1000,
              },
            },
          }),
          createMediaTestHelper({
            id: 456,
            type: 'tv',
            state: {
              record: {
                id: 2,
                status: 'available',
                jellyfinId: null,
                createdAt: 2000,
                updatedAt: 2000,
              },
            },
          }),
        ];

        const result = interactionRepository.getAllInteractionsWithUsersBatch(realDb, mediaItems);

        expect(result.size).toBe(2);
        expect(result.get(1)).toHaveLength(1);
        expect(result.get(1)?.[0]?.action).toBe('liked');
        expect(result.get(2)).toHaveLength(1);
        expect(result.get(2)?.[0]?.action).toBe('liked');
      });
    });

    describe('getMediaByUserInteraction', () => {
      it('should return media for user with specific interaction', () => {
        // Create media
        const media1 = mediaRepository.createMedia(realDb, 123, 'movie', 'requested');
        const media2 = mediaRepository.createMedia(realDb, 456, 'tv', 'available');

        // Create users
        createUser('user1@example.com', 'User One');
        createUser('user2@example.com', 'User Two');

        // Add interactions
        interactionRepository.addInteraction(realDb, 1, media1.id, 'liked');
        interactionRepository.addInteraction(realDb, 1, media2.id, 'disliked'); // User 1 dislikes media 2
        interactionRepository.addInteraction(realDb, 2, media1.id, 'liked');

        const result = interactionRepository.getMediaByUserInteraction(realDb, 1, 'liked');

        expect(result).toHaveLength(1);
        expect(result[0]?.tmdbId).toBe(123);
        expect(result[0]?.mediaType).toBe('movie');
      });

      it('should return empty array when user has no interactions of that type', () => {
        createUser('user@example.com', 'User');
        const result = interactionRepository.getMediaByUserInteraction(realDb, 1, 'liked');
        expect(result).toHaveLength(0);
      });

      it('should order results by interaction creation time DESC', () => {
        const media1 = mediaRepository.createMedia(realDb, 123, 'movie', 'requested');
        const media2 = mediaRepository.createMedia(realDb, 456, 'tv', 'available');

        createUser('user@example.com', 'User');

        // Add interactions (newer requested last)
        interactionRepository.addInteraction(realDb, 1, media1.id, 'liked');
        interactionRepository.addInteraction(realDb, 1, media2.id, 'liked');

        const result = interactionRepository.getMediaByUserInteraction(realDb, 1, 'liked');

        // Most recent request should be first
        expect(result).toHaveLength(2);
        expect(result[0]?.tmdbId).toBe(456); // Most recent
        expect(result[1]?.tmdbId).toBe(123); // Older
      });
    });

    describe('getMediaByInteraction', () => {
      it('should return all media with specific interaction from any user', () => {
        const media1 = mediaRepository.createMedia(realDb, 123, 'movie', 'requested');
        const media2 = mediaRepository.createMedia(realDb, 456, 'tv', 'available');

        createUser('user1@example.com', 'User One');
        createUser('user2@example.com', 'User Two');

        // Different users requesting different media
        interactionRepository.addInteraction(realDb, 1, media1.id, 'liked');
        interactionRepository.addInteraction(realDb, 2, media2.id, 'liked');
        interactionRepository.addInteraction(realDb, 1, media2.id, 'liked'); // Different action

        const result = interactionRepository.getMediaByInteraction(realDb, 'liked');

        expect(result).toHaveLength(2);
        expect(result.map(r => r.tmdbId).sort()).toEqual([123, 456]);
      });

      it('should return empty array when no media has that interaction', () => {
        const result = interactionRepository.getMediaByInteraction(realDb, 'liked');
        expect(result).toHaveLength(0);
      });

      it('should return distinct media when multiple users have same interaction', () => {
        const media = mediaRepository.createMedia(realDb, 123, 'movie', 'requested');

        createUser('user1@example.com', 'User One');
        createUser('user2@example.com', 'User Two');

        // Both users request the same media
        interactionRepository.addInteraction(realDb, 1, media.id, 'liked');
        interactionRepository.addInteraction(realDb, 2, media.id, 'liked');

        const result = interactionRepository.getMediaByInteraction(realDb, 'liked');

        // Should only return the media once
        expect(result).toHaveLength(1);
        expect(result[0]?.tmdbId).toBe(123);
      });
    });
  });
});
