import type { Media } from '@findarr/shared';
import SqlDatabase from 'better-sqlite3';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as authService from '../auth/service.js';
import { createDatabase, type DB } from '../db/setup.js';
import * as mediaRepository from '../media/repository.js';
import {
  createTestMedia as createMediaTestHelper,
  createTestUserInDb,
} from '../utils/testHelper.js';
import * as interactionRepository from './repository.js';

describe('interaction repository', () => {
  let db: DB;
  let sqliteDb: SqlDatabase.Database;

  beforeEach(() => {
    const result = createDatabase(':memory:');
    db = result.db;
    sqliteDb = result.sqliteDb;

    // Mock password hashing for speed - we're testing interactions, not crypto
    vi.spyOn(authService, 'hashPassword').mockResolvedValue('hashed-password');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    sqliteDb.close();
  });

  describe('addInteraction', () => {
    it('should add user interaction', async () => {
      const media = await mediaRepository.createMedia(db, 123, 'movie');
      await createTestUserInDb(db);

      await interactionRepository.addInteraction(db, 1, media.id, 'liked');

      // Verify interaction was created
      const hasIt = await interactionRepository.hasInteraction(db, 1, media.id, 'liked');
      expect(hasIt).toBe(true);
    });

    it('should handle ON CONFLICT by doing nothing (idempotent)', async () => {
      const media = await mediaRepository.createMedia(db, 123, 'movie');
      await createTestUserInDb(db);

      // Add the same interaction twice
      await interactionRepository.addInteraction(db, 1, media.id, 'liked');
      await interactionRepository.addInteraction(db, 1, media.id, 'liked');

      // Should still only have one interaction
      const votes = await interactionRepository.getVoteCounts(db, media.id);
      expect(votes.likes).toBe(1);
    });
  });

  describe('hasInteraction', () => {
    it('should return true when interaction exists', async () => {
      const media = await mediaRepository.createMedia(db, 123, 'movie');
      await createTestUserInDb(db);
      await interactionRepository.addInteraction(db, 1, media.id, 'liked');

      const result = await interactionRepository.hasInteraction(db, 1, media.id, 'liked');

      expect(result).toBe(true);
    });

    it('should return false when interaction does not exist', async () => {
      const media = await mediaRepository.createMedia(db, 123, 'movie');
      await createTestUserInDb(db);

      const result = await interactionRepository.hasInteraction(db, 1, media.id, 'liked');

      expect(result).toBe(false);
    });

    it('should return false for wrong action type', async () => {
      const media = await mediaRepository.createMedia(db, 123, 'movie');
      await createTestUserInDb(db);
      await interactionRepository.addInteraction(db, 1, media.id, 'liked');

      const result = await interactionRepository.hasInteraction(db, 1, media.id, 'disliked');

      expect(result).toBe(false);
    });
  });

  describe('removeAllInteractions', () => {
    it('should remove all interactions for a user on specific media', async () => {
      const media = await mediaRepository.createMedia(db, 123, 'movie');
      await createTestUserInDb(db);
      await interactionRepository.addInteraction(db, 1, media.id, 'liked');

      expect(await interactionRepository.hasInteraction(db, 1, media.id, 'liked')).toBe(true);

      await interactionRepository.removeAllInteractions(db, 1, media.id);

      expect(await interactionRepository.hasInteraction(db, 1, media.id, 'liked')).toBe(false);
    });

    it('should not affect other users interactions', async () => {
      const media = await mediaRepository.createMedia(db, 123, 'movie');
      await createTestUserInDb(db, { email: 'user1@test.com', displayName: 'User 1' });
      await createTestUserInDb(db, { email: 'user2@test.com', displayName: 'User 2' });
      await interactionRepository.addInteraction(db, 1, media.id, 'liked');
      await interactionRepository.addInteraction(db, 2, media.id, 'liked');

      await interactionRepository.removeAllInteractions(db, 1, media.id);

      expect(await interactionRepository.hasInteraction(db, 1, media.id, 'liked')).toBe(false);
      expect(await interactionRepository.hasInteraction(db, 2, media.id, 'liked')).toBe(true);
    });
  });

  describe('getVoteCounts', () => {
    it('should return correct vote counts', async () => {
      const media = await mediaRepository.createMedia(db, 123, 'movie');
      await createTestUserInDb(db, { email: 'user1@test.com', displayName: 'User 1' });
      await createTestUserInDb(db, { email: 'user2@test.com', displayName: 'User 2' });
      await createTestUserInDb(db, { email: 'user3@test.com', displayName: 'User 3' });

      await interactionRepository.addInteraction(db, 1, media.id, 'liked');
      await interactionRepository.addInteraction(db, 2, media.id, 'liked');
      await interactionRepository.addInteraction(db, 3, media.id, 'disliked');

      const votes = await interactionRepository.getVoteCounts(db, media.id);

      expect(votes.likes).toBe(2);
      expect(votes.dislikes).toBe(1);
    });

    it('should return zero counts when no interactions exist', async () => {
      const media = await mediaRepository.createMedia(db, 123, 'movie');

      const votes = await interactionRepository.getVoteCounts(db, media.id);

      expect(votes.likes).toBe(0);
      expect(votes.dislikes).toBe(0);
    });
  });

  describe('batch queries', () => {
    describe('getInteractionsBatch', () => {
      it('should return empty map for empty input', async () => {
        const result = await interactionRepository.getInteractionsBatch(db, [], 1);
        expect(result.size).toBe(0);
      });

      it('should return empty map when media items have no records', async () => {
        const mediaItems: Media[] = [createMediaTestHelper({ tmdbId: 123, type: 'movie' })];

        const result = await interactionRepository.getInteractionsBatch(db, mediaItems, 1);
        expect(result.size).toBe(0);
      });

      it('should fetch interactions for user across multiple media items', async () => {
        // Setup: Create media records
        const media1 = await mediaRepository.createMedia(db, 123, 'movie', 'requested');
        const media2 = await mediaRepository.createMedia(db, 456, 'tv', 'available');

        // Setup: Create user
        await createTestUserInDb(db, { email: 'user@example.com', displayName: 'User One' });

        // Setup: Add interactions
        await interactionRepository.addInteraction(db, 1, media1.id, 'liked');
        await interactionRepository.addInteraction(db, 1, media2.id, 'disliked');

        const mediaItems: Media[] = [
          createMediaTestHelper({
            tmdbId: 123,
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
            tmdbId: 456,
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

        const result = await interactionRepository.getInteractionsBatch(db, mediaItems, 1);

        expect(result.size).toBe(2);
        expect(result.get(1)).toHaveLength(1);
        expect(result.get(1)?.[0]?.action).toBe('liked');
        expect(result.get(2)).toHaveLength(1);
        expect(result.get(2)?.[0]?.action).toBe('disliked');
      });

      it('should only return interactions for specified user', async () => {
        // Setup: Create media
        const media = await mediaRepository.createMedia(db, 123, 'movie', 'requested');

        // Setup: Create users
        await createTestUserInDb(db, { email: 'user1@example.com', displayName: 'User One' });
        await createTestUserInDb(db, { email: 'user2@example.com', displayName: 'User Two' });

        // Setup: Add interactions for different users
        await interactionRepository.addInteraction(db, 1, media.id, 'liked');
        await interactionRepository.addInteraction(db, 2, media.id, 'liked');

        const mediaItems: Media[] = [
          createMediaTestHelper({
            tmdbId: 123,
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

        const resultUser1 = await interactionRepository.getInteractionsBatch(db, mediaItems, 1);
        const resultUser2 = await interactionRepository.getInteractionsBatch(db, mediaItems, 2);

        expect(resultUser1.get(1)).toHaveLength(1);
        expect(resultUser1.get(1)?.[0]?.action).toBe('liked');
        expect(resultUser2.get(1)).toHaveLength(1);
        expect(resultUser2.get(1)?.[0]?.action).toBe('liked');
      });
    });

    describe('getAllInteractionsWithUsersBatch', () => {
      it('should return empty map for empty input', async () => {
        const result = await interactionRepository.getAllInteractionsWithUsersBatch(db, []);
        expect(result.size).toBe(0);
      });

      it('should return empty map when media items have no records', async () => {
        const mediaItems: Media[] = [createMediaTestHelper({ tmdbId: 123, type: 'movie' })];

        const result = await interactionRepository.getAllInteractionsWithUsersBatch(db, mediaItems);
        expect(result.size).toBe(0);
      });

      it('should fetch all interactions with user info', async () => {
        // Setup: Create media
        const media = await mediaRepository.createMedia(db, 123, 'movie', 'requested');

        // Setup: Create users
        await createTestUserInDb(db, { email: 'alice@example.com', displayName: 'Alice' });
        await createTestUserInDb(db, {
          email: 'bob@example.com',
          displayName: 'Bob',
          role: 'admin',
        });

        // Setup: Add interactions
        await interactionRepository.addInteraction(db, 1, media.id, 'liked');
        await interactionRepository.addInteraction(db, 2, media.id, 'liked');

        const mediaItems: Media[] = [
          createMediaTestHelper({
            tmdbId: 123,
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

        const result = await interactionRepository.getAllInteractionsWithUsersBatch(db, mediaItems);

        expect(result.size).toBe(1);
        const interactions = result.get(1);
        expect(interactions).toHaveLength(2);

        const aliceInteraction = interactions?.find(i => i.user?.email === 'alice@example.com');
        expect(aliceInteraction).toMatchObject({
          action: 'liked',
          user: {
            id: 1,
            email: 'alice@example.com',
            displayName: 'Alice',
          },
        });

        const bobInteraction = interactions?.find(i => i.user?.email === 'bob@example.com');
        expect(bobInteraction).toMatchObject({
          action: 'liked',
          user: {
            id: 2,
            email: 'bob@example.com',
            displayName: 'Bob',
          },
        });
      });

      it('should order interactions by createdAt DESC', async () => {
        // Setup: Create media
        const media = await mediaRepository.createMedia(db, 123, 'movie', 'requested');

        // Setup: Create users
        await createTestUserInDb(db, { email: 'user1@example.com', displayName: 'User One' });
        await createTestUserInDb(db, { email: 'user2@example.com', displayName: 'User Two' });

        // Setup: Add interactions at different times (SQLite uses unixepoch() by default)
        // We'll insert them manually with specific timestamps
        const time1 = Math.floor(Date.now() / 1000) - 100;
        const time2 = Math.floor(Date.now() / 1000) - 50;
        const time3 = Math.floor(Date.now() / 1000);

        // Note: Using raw SQL here to set custom createdAt timestamps for ordering test
        sqliteDb
          .prepare(
            'INSERT INTO user_media_interactions (userId, mediaId, action, createdAt) VALUES (?, ?, ?, ?)'
          )
          .run(1, media.id, 'liked', time1);
        sqliteDb
          .prepare(
            'INSERT INTO user_media_interactions (userId, mediaId, action, createdAt) VALUES (?, ?, ?, ?)'
          )
          .run(1, media.id, 'disliked', time2);
        sqliteDb
          .prepare(
            'INSERT INTO user_media_interactions (userId, mediaId, action, createdAt) VALUES (?, ?, ?, ?)'
          )
          .run(2, media.id, 'liked', time3); // Different user for second 'liked'

        const mediaItems: Media[] = [
          createMediaTestHelper({
            tmdbId: 123,
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

        const result = await interactionRepository.getAllInteractionsWithUsersBatch(db, mediaItems);
        const interactions = result.get(1);

        expect(interactions).toHaveLength(3);
        // Should be ordered by createdAt DESC (most recent first)
        expect(interactions?.[0]?.action).toBe('liked'); // time3
        expect(interactions?.[1]?.action).toBe('disliked'); // time2
        expect(interactions?.[2]?.action).toBe('liked'); // time1
      });

      it('should handle multiple media items', async () => {
        // Setup: Create media
        const media1 = await mediaRepository.createMedia(db, 123, 'movie', 'requested');
        const media2 = await mediaRepository.createMedia(db, 456, 'tv', 'available');

        // Setup: Create user
        await createTestUserInDb(db, { email: 'user@example.com', displayName: 'User' });

        // Setup: Add interactions
        await interactionRepository.addInteraction(db, 1, media1.id, 'liked');
        await interactionRepository.addInteraction(db, 1, media2.id, 'liked');

        const mediaItems: Media[] = [
          createMediaTestHelper({
            tmdbId: 123,
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
            tmdbId: 456,
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

        const result = await interactionRepository.getAllInteractionsWithUsersBatch(db, mediaItems);

        expect(result.size).toBe(2);
        expect(result.get(1)).toHaveLength(1);
        expect(result.get(1)?.[0]?.action).toBe('liked');
        expect(result.get(2)).toHaveLength(1);
        expect(result.get(2)?.[0]?.action).toBe('liked');
      });
    });

    describe('getMediaByUserInteraction', () => {
      it('should return media for user with specific interaction', async () => {
        // Create media
        const media1 = await mediaRepository.createMedia(db, 123, 'movie', 'requested');
        const media2 = await mediaRepository.createMedia(db, 456, 'tv', 'available');

        // Create users
        await createTestUserInDb(db, { email: 'user1@example.com', displayName: 'User One' });
        await createTestUserInDb(db, { email: 'user2@example.com', displayName: 'User Two' });

        // Add interactions
        await interactionRepository.addInteraction(db, 1, media1.id, 'liked');
        await interactionRepository.addInteraction(db, 1, media2.id, 'disliked'); // User 1 dislikes media 2
        await interactionRepository.addInteraction(db, 2, media1.id, 'liked');

        const result = await interactionRepository.getMediaByUserInteraction(db, 1, 'liked');

        expect(result).toHaveLength(1);
        expect(result[0]?.tmdbId).toBe(123);
        expect(result[0]?.type).toBe('movie');
      });

      it('should return empty array when user has no interactions of that type', async () => {
        await createTestUserInDb(db, { email: 'user@example.com', displayName: 'User' });
        const result = await interactionRepository.getMediaByUserInteraction(db, 1, 'liked');
        expect(result).toHaveLength(0);
      });

      it('should order results by interaction creation time DESC', async () => {
        const media1 = await mediaRepository.createMedia(db, 123, 'movie', 'requested');
        const media2 = await mediaRepository.createMedia(db, 456, 'tv', 'available');

        await createTestUserInDb(db, { email: 'user@example.com', displayName: 'User' });

        // Add interactions (newer requested last)
        await interactionRepository.addInteraction(db, 1, media1.id, 'liked');
        await interactionRepository.addInteraction(db, 1, media2.id, 'liked');

        const result = await interactionRepository.getMediaByUserInteraction(db, 1, 'liked');

        // Most recent request should be first
        expect(result).toHaveLength(2);
        expect(result[0]?.tmdbId).toBe(456); // Most recent
        expect(result[1]?.tmdbId).toBe(123); // Older
      });
    });

    describe('getMediaByInteraction', () => {
      it('should return all media with specific interaction from any user', async () => {
        const media1 = await mediaRepository.createMedia(db, 123, 'movie', 'requested');
        const media2 = await mediaRepository.createMedia(db, 456, 'tv', 'available');

        await createTestUserInDb(db, { email: 'user1@example.com', displayName: 'User One' });
        await createTestUserInDb(db, { email: 'user2@example.com', displayName: 'User Two' });

        // Different users requesting different media
        await interactionRepository.addInteraction(db, 1, media1.id, 'liked');
        await interactionRepository.addInteraction(db, 2, media2.id, 'liked');
        await interactionRepository.addInteraction(db, 1, media2.id, 'liked'); // Different action

        const result = await interactionRepository.getMediaByInteraction(db, 'liked');

        expect(result).toHaveLength(2);
        expect(result.map(r => r.tmdbId).sort()).toEqual([123, 456]);
      });

      it('should return empty array when no media has that interaction', async () => {
        const result = await interactionRepository.getMediaByInteraction(db, 'liked');
        expect(result).toHaveLength(0);
      });

      it('should return distinct media when multiple users have same interaction', async () => {
        const media = await mediaRepository.createMedia(db, 123, 'movie', 'requested');

        await createTestUserInDb(db, { email: 'user1@example.com', displayName: 'User One' });
        await createTestUserInDb(db, { email: 'user2@example.com', displayName: 'User Two' });

        // Both users request the same media
        await interactionRepository.addInteraction(db, 1, media.id, 'liked');
        await interactionRepository.addInteraction(db, 2, media.id, 'liked');

        const result = await interactionRepository.getMediaByInteraction(db, 'liked');

        // Should only return the media once
        expect(result).toHaveLength(1);
        expect(result[0]?.tmdbId).toBe(123);
      });
    });
  });
});
