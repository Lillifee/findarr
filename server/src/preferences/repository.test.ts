import SqlDatabase from 'better-sqlite3';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as authService from '../auth/service.js';
import { createDatabase, type DB } from '../db/setup.js';
import { createTestUserInDb } from '../utils/testHelper.js';
import * as preferencesRepository from './repository.js';

describe('preferences repository', () => {
  let db: DB;
  let sqliteDb: SqlDatabase.Database;
  let userId: number;

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

  describe('updateGenrePreference', () => {
    it('should create a new preference', async () => {
      await preferencesRepository.updateGenrePreference(db, userId, { id: 28, name: 'Action' }, 1);

      const preferences = await preferencesRepository.getUserGenrePreferences(db, userId);

      expect(preferences.size).toBe(1);
      expect(preferences.get(28)).toEqual({
        genreId: 28,
        genreName: 'Action',
        score: 1,
        count: 1,
      });
    });

    it('should increment existing preference score and count', async () => {
      await preferencesRepository.updateGenrePreference(db, userId, { id: 28, name: 'Action' }, 1);
      await preferencesRepository.updateGenrePreference(db, userId, { id: 28, name: 'Action' }, 1);

      const preferences = await preferencesRepository.getUserGenrePreferences(db, userId);

      expect(preferences.get(28)?.score).toBe(2);
      expect(preferences.get(28)?.count).toBe(2);
    });

    it('should decrement preference score with negative delta but still increment count', async () => {
      await preferencesRepository.updateGenrePreference(db, userId, { id: 28, name: 'Action' }, 1);
      await preferencesRepository.updateGenrePreference(
        db,
        userId,
        { id: 28, name: 'Action' },
        -0.5
      );

      const preferences = await preferencesRepository.getUserGenrePreferences(db, userId);

      expect(preferences.get(28)?.score).toBe(0.5);
      expect(preferences.get(28)?.count).toBe(2);
    });

    it('should handle multiple genres independently', async () => {
      await preferencesRepository.updateGenrePreference(db, userId, { id: 28, name: 'Action' }, 1);
      await preferencesRepository.updateGenrePreference(
        db,
        userId,
        { id: 12, name: 'Adventure' },
        1
      );
      await preferencesRepository.updateGenrePreference(
        db,
        userId,
        { id: 28, name: 'Action' },
        0.5
      );

      const preferences = await preferencesRepository.getUserGenrePreferences(db, userId);

      expect(preferences.size).toBe(2);
      expect(preferences.get(28)?.score).toBe(1.5);
      expect(preferences.get(28)?.count).toBe(2);
      expect(preferences.get(12)?.score).toBe(1);
      expect(preferences.get(12)?.count).toBe(1);
    });

    it('should update genre name on conflict', async () => {
      await preferencesRepository.updateGenrePreference(db, userId, { id: 28, name: 'Action' }, 1);

      // Small delay to ensure timestamp is different
      await new Promise(resolve => setTimeout(resolve, 10));

      await preferencesRepository.updateGenrePreference(db, userId, { id: 28, name: 'Action' }, 1);

      // Verify the preference exists
      const preferences = await preferencesRepository.getUserGenrePreferences(db, userId);
      expect(preferences.get(28)).toBeDefined();
      expect(preferences.get(28)?.genreName).toBe('Action');
    });
  });

  describe('getUserGenrePreferences', () => {
    it('should return empty map for user with no preferences', async () => {
      const preferences = await preferencesRepository.getUserGenrePreferences(db, userId);

      expect(preferences.size).toBe(0);
    });

    it('should return all preferences for a user', async () => {
      await preferencesRepository.updateGenrePreference(db, userId, { id: 28, name: 'Action' }, 1);
      await preferencesRepository.updateGenrePreference(
        db,
        userId,
        { id: 12, name: 'Adventure' },
        0.5
      );
      await preferencesRepository.updateGenrePreference(
        db,
        userId,
        { id: 35, name: 'Comedy' },
        -0.5
      );

      const preferences = await preferencesRepository.getUserGenrePreferences(db, userId);

      expect(preferences.size).toBe(3);
      expect(preferences.get(28)?.score).toBe(1);
      expect(preferences.get(12)?.score).toBe(0.5);
      expect(preferences.get(35)?.score).toBe(-0.5);
    });

    it('should return preferences only for the specified user', async () => {
      const user2 = await createTestUserInDb(db, { email: 'user2@test.com' });

      await preferencesRepository.updateGenrePreference(db, userId, { id: 28, name: 'Action' }, 1);
      await preferencesRepository.updateGenrePreference(
        db,
        user2.id,
        { id: 28, name: 'Action' },
        2
      );

      const preferences1 = await preferencesRepository.getUserGenrePreferences(db, userId);
      const preferences2 = await preferencesRepository.getUserGenrePreferences(db, user2.id);

      expect(preferences1.get(28)?.score).toBe(1);
      expect(preferences2.get(28)?.score).toBe(2);
    });

    it('should return map with genreId as key', async () => {
      await preferencesRepository.updateGenrePreference(db, userId, { id: 28, name: 'Action' }, 1);
      await preferencesRepository.updateGenrePreference(
        db,
        userId,
        { id: 12, name: 'Adventure' },
        0.5
      );

      const preferences = await preferencesRepository.getUserGenrePreferences(db, userId);

      // Can directly access by genre ID
      expect(preferences.has(28)).toBe(true);
      expect(preferences.has(12)).toBe(true);
      expect(preferences.has(999)).toBe(false);
    });
  });

  describe('count tracking and Bayesian normalization', () => {
    it('should track count independently from score', async () => {
      // Like once
      await preferencesRepository.updateGenrePreference(db, userId, { id: 28, name: 'Action' }, 1);
      let prefs = await preferencesRepository.getUserGenrePreferences(db, userId);
      expect(prefs.get(28)).toEqual({
        genreId: 28,
        genreName: 'Action',
        score: 1,
        count: 1,
      });

      // Dislike (toggle)
      await preferencesRepository.updateGenrePreference(db, userId, { id: 28, name: 'Action' }, -1);
      prefs = await preferencesRepository.getUserGenrePreferences(db, userId);
      expect(prefs.get(28)).toEqual({
        genreId: 28,
        genreName: 'Action',
        score: 0,
        count: 2,
      });

      // Like again
      await preferencesRepository.updateGenrePreference(db, userId, { id: 28, name: 'Action' }, 1);
      prefs = await preferencesRepository.getUserGenrePreferences(db, userId);
      expect(prefs.get(28)).toEqual({
        genreId: 28,
        genreName: 'Action',
        score: 1,
        count: 3,
      });
    });

    it('should support confidence building through count', async () => {
      // Rate multiple times to build confidence
      await preferencesRepository.updateGenrePreference(db, userId, { id: 28, name: 'Action' }, 1);
      await preferencesRepository.updateGenrePreference(db, userId, { id: 28, name: 'Action' }, 1);
      await preferencesRepository.updateGenrePreference(db, userId, { id: 28, name: 'Action' }, 1);
      await preferencesRepository.updateGenrePreference(db, userId, { id: 28, name: 'Action' }, 1);
      await preferencesRepository.updateGenrePreference(db, userId, { id: 28, name: 'Action' }, 1);

      const prefs = await preferencesRepository.getUserGenrePreferences(db, userId);
      expect(prefs.get(28)?.score).toBe(5);
      expect(prefs.get(28)?.count).toBe(5);
    });
  });

  describe('updateKeywordPreference', () => {
    it('should create a new keyword preference', async () => {
      await preferencesRepository.updateKeywordPreference(
        db,
        userId,
        { id: 9715, name: 'superhero' },
        1
      );

      const preferences = await preferencesRepository.getUserKeywordPreferences(db, userId);

      expect(preferences.size).toBe(1);
      expect(preferences.get(9715)).toEqual({
        keywordId: 9715,
        keywordName: 'superhero',
        score: 1,
        count: 1,
      });
    });

    it('should increment existing keyword preference', async () => {
      await preferencesRepository.updateKeywordPreference(
        db,
        userId,
        { id: 9715, name: 'superhero' },
        1
      );
      await preferencesRepository.updateKeywordPreference(
        db,
        userId,
        { id: 9715, name: 'superhero' },
        0.5
      );

      const preferences = await preferencesRepository.getUserKeywordPreferences(db, userId);

      expect(preferences.get(9715)?.score).toBe(1.5);
      expect(preferences.get(9715)?.count).toBe(2);
    });

    it('should handle negative keyword preferences', async () => {
      await preferencesRepository.updateKeywordPreference(
        db,
        userId,
        { id: 9715, name: 'superhero' },
        -0.5
      );

      const preferences = await preferencesRepository.getUserKeywordPreferences(db, userId);

      expect(preferences.get(9715)?.score).toBe(-0.5);
      expect(preferences.get(9715)?.count).toBe(1);
    });
  });

  describe('getUserKeywordPreferences', () => {
    it('should return empty map for user with no keyword preferences', async () => {
      const preferences = await preferencesRepository.getUserKeywordPreferences(db, userId);

      expect(preferences.size).toBe(0);
    });

    it('should return all keyword preferences for a user', async () => {
      await preferencesRepository.updateKeywordPreference(
        db,
        userId,
        { id: 9715, name: 'superhero' },
        1
      );
      await preferencesRepository.updateKeywordPreference(
        db,
        userId,
        { id: 180_547, name: 'super power' },
        0.5
      );
      await preferencesRepository.updateKeywordPreference(
        db,
        userId,
        { id: 10_090, name: 'animation' },
        -0.5
      );

      const preferences = await preferencesRepository.getUserKeywordPreferences(db, userId);

      expect(preferences.size).toBe(3);
      expect(preferences.get(9715)?.score).toBe(1);
      expect(preferences.get(180_547)?.score).toBe(0.5);
      expect(preferences.get(10_090)?.score).toBe(-0.5);
    });
  });
});
