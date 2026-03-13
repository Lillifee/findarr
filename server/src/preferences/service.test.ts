import type { Genre, Keyword } from '@findarr/shared';
import SqlDatabase from 'better-sqlite3';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as authService from '../auth/service.js';
import { createDatabase, type DB } from '../db/setup.js';
import { createTestUserInDb } from '../utils/testHelper.js';
import * as preferencesRepository from './repository.js';
import * as preferencesService from './service.js';

describe('preferences service', () => {
  let db: DB;
  let sqliteDb: SqlDatabase.Database;
  let userId: number;

  const actionGenre: Genre = { id: 28, name: 'Action' };
  const adventureGenre: Genre = { id: 12, name: 'Adventure' };
  const comedyGenre: Genre = { id: 35, name: 'Comedy' };

  const explosionKeyword: Keyword = { id: 123, name: 'explosion' };
  const heroKeyword: Keyword = { id: 456, name: 'hero' };
  const funnyKeyword: Keyword = { id: 789, name: 'funny' };

  beforeEach(async () => {
    const result = createDatabase(':memory:');
    db = result.db;
    sqliteDb = result.sqliteDb;

    // Mock password hashing for speed
    vi.spyOn(authService, 'hashPassword').mockResolvedValue('hashed-password');

    // Create a test user
    const user = await createTestUserInDb(db);
    userId = user.id;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    sqliteDb.close();
  });

  describe('updateGenreFromInteraction', () => {
    it('should add positive score for liked action', async () => {
      await preferencesService.updateGenreFromInteraction(
        db,
        userId,
        [actionGenre, adventureGenre],
        'liked',
        false
      );

      const preferences = await preferencesRepository.getUserGenrePreferences(db, userId);

      expect(preferences.get(28)?.score).toBe(1);
      expect(preferences.get(12)?.score).toBe(1);
    });

    it('should add negative score for disliked action', async () => {
      await preferencesService.updateGenreFromInteraction(
        db,
        userId,
        [actionGenre, comedyGenre],
        'disliked',
        false
      );

      const preferences = await preferencesRepository.getUserGenrePreferences(db, userId);

      expect(preferences.get(28)?.score).toBe(-0.5);
      expect(preferences.get(35)?.score).toBe(-0.5);
    });

    it('should remove score when toggling off a like', async () => {
      // First, add a like
      await preferencesService.updateGenreFromInteraction(
        db,
        userId,
        [actionGenre],
        'liked',
        false
      );

      // Then toggle it off
      await preferencesService.updateGenreFromInteraction(db, userId, [actionGenre], 'liked', true);

      const preferences = await preferencesRepository.getUserGenrePreferences(db, userId);

      expect(preferences.get(28)?.score).toBe(0);
    });

    it('should remove score when toggling off a dislike', async () => {
      // First, add a dislike
      await preferencesService.updateGenreFromInteraction(
        db,
        userId,
        [actionGenre],
        'disliked',
        false
      );

      // Then toggle it off
      await preferencesService.updateGenreFromInteraction(
        db,
        userId,
        [actionGenre],
        'disliked',
        true
      );

      const preferences = await preferencesRepository.getUserGenrePreferences(db, userId);

      expect(preferences.get(28)?.score).toBe(0);
    });

    it('should handle multiple genres in one interaction', async () => {
      const genres = [actionGenre, adventureGenre, comedyGenre];

      await preferencesService.updateGenreFromInteraction(db, userId, genres, 'liked', false);

      const preferences = await preferencesRepository.getUserGenrePreferences(db, userId);

      expect(preferences.size).toBe(3);
      expect(preferences.get(28)?.score).toBe(1);
      expect(preferences.get(12)?.score).toBe(1);
      expect(preferences.get(35)?.score).toBe(1);
    });

    it('should accumulate scores across multiple interactions', async () => {
      // Like action movie
      await preferencesService.updateGenreFromInteraction(
        db,
        userId,
        [actionGenre],
        'liked',
        false
      );

      // Like action/adventure movie
      await preferencesService.updateGenreFromInteraction(
        db,
        userId,
        [actionGenre, adventureGenre],
        'liked',
        false
      );

      // Dislike comedy
      await preferencesService.updateGenreFromInteraction(
        db,
        userId,
        [comedyGenre],
        'disliked',
        false
      );

      const preferences = await preferencesRepository.getUserGenrePreferences(db, userId);

      expect(preferences.get(28)?.score).toBe(2); // 1 + 1
      expect(preferences.get(12)?.score).toBe(1); // 1
      expect(preferences.get(35)?.score).toBe(-0.5); // -0.5
    });

    it('should handle empty genre array gracefully', async () => {
      await preferencesService.updateGenreFromInteraction(db, userId, [], 'liked', false);

      const preferences = await preferencesRepository.getUserGenrePreferences(db, userId);

      expect(preferences.size).toBe(0);
    });

    it('should throw on repository error', async () => {
      // Mock repository to throw error
      vi.spyOn(preferencesRepository, 'updateGenrePreference').mockRejectedValue(
        new Error('DB error')
      );

      // Should throw because no error handling in the service
      await expect(
        preferencesService.updateGenreFromInteraction(db, userId, [actionGenre], 'liked', false)
      ).rejects.toThrow('DB error');
    });
  });

  describe('updateKeywordFromInteraction', () => {
    it('should add positive score for liked action', async () => {
      await preferencesService.updateKeywordFromInteraction(
        db,
        userId,
        [explosionKeyword, heroKeyword],
        'liked',
        false
      );

      const preferences = await preferencesRepository.getUserKeywordPreferences(db, userId);

      expect(preferences.get(123)?.score).toBe(1);
      expect(preferences.get(456)?.score).toBe(1);
    });

    it('should add negative score for disliked action', async () => {
      await preferencesService.updateKeywordFromInteraction(
        db,
        userId,
        [explosionKeyword, funnyKeyword],
        'disliked',
        false
      );

      const preferences = await preferencesRepository.getUserKeywordPreferences(db, userId);

      expect(preferences.get(123)?.score).toBe(-0.5);
      expect(preferences.get(789)?.score).toBe(-0.5);
    });

    it('should remove score when toggling off a like', async () => {
      // First, add a like
      await preferencesService.updateKeywordFromInteraction(
        db,
        userId,
        [explosionKeyword],
        'liked',
        false
      );

      // Then toggle it off
      await preferencesService.updateKeywordFromInteraction(
        db,
        userId,
        [explosionKeyword],
        'liked',
        true
      );

      const preferences = await preferencesRepository.getUserKeywordPreferences(db, userId);

      expect(preferences.get(123)?.score).toBe(0);
    });
  });

  describe('updatePreferencesForInteraction', () => {
    it('should update both genres and keywords when keywords are provided', async () => {
      await preferencesService.updatePreferencesForInteraction(
        db,
        userId,
        [actionGenre, adventureGenre],
        [explosionKeyword, heroKeyword],
        'liked',
        false
      );

      const genrePrefs = await preferencesRepository.getUserGenrePreferences(db, userId);
      const keywordPrefs = await preferencesRepository.getUserKeywordPreferences(db, userId);

      expect(genrePrefs.get(28)?.score).toBe(1);
      expect(genrePrefs.get(12)?.score).toBe(1);
      expect(keywordPrefs.get(123)?.score).toBe(1);
      expect(keywordPrefs.get(456)?.score).toBe(1);
    });

    it('should update only genres when keywords are undefined', async () => {
      await preferencesService.updatePreferencesForInteraction(
        db,
        userId,
        [actionGenre],
        undefined,
        'liked',
        false
      );

      const genrePrefs = await preferencesRepository.getUserGenrePreferences(db, userId);
      const keywordPrefs = await preferencesRepository.getUserKeywordPreferences(db, userId);

      expect(genrePrefs.get(28)?.score).toBe(1);
      expect(keywordPrefs.size).toBe(0);
    });

    it('should update only genres when keywords array is empty', async () => {
      await preferencesService.updatePreferencesForInteraction(
        db,
        userId,
        [actionGenre],
        [],
        'disliked',
        false
      );

      const genrePrefs = await preferencesRepository.getUserGenrePreferences(db, userId);
      const keywordPrefs = await preferencesRepository.getUserKeywordPreferences(db, userId);

      expect(genrePrefs.get(28)?.score).toBe(-0.5);
      expect(keywordPrefs.size).toBe(0);
    });
  });
});
