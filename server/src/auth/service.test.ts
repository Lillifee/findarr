import type { DbUser } from '@findarr/shared';
import * as argon2 from '@node-rs/argon2';
import SqlDatabase from 'better-sqlite3';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createDatabase, type DB } from '../db/setup.js';
import { createTestUserInDb } from '../utils/testHelper.js';
import * as authService from './service.js';

vi.mock('@node-rs/argon2');

describe('auth service', () => {
  let db: DB;
  let sqliteDb: SqlDatabase.Database;

  beforeEach(() => {
    const result = createDatabase(':memory:');
    db = result.db;
    sqliteDb = result.sqliteDb;

    // Mock password hashing for speed
    vi.spyOn(authService, 'hashPassword').mockResolvedValue('hashed-password');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    sqliteDb.close();
  });

  describe('login', () => {
    it('should return user without password on valid credentials', async () => {
      await createTestUserInDb(db, {
        email: 'test@example.com',
        password: 'secret',
      });
      vi.spyOn(argon2, 'verify').mockResolvedValue(true);

      const result = await authService.login(db, {
        email: 'test@example.com',
        password: 'secret',
      });

      expect(result).toBeDefined();
      expect(result.email).toBe('test@example.com');
      expect((result as DbUser).passwordHash).toBeUndefined();
    });

    it('should throw Unauthorized for wrong password', async () => {
      await createTestUserInDb(db, {
        email: 'test@example.com',
        password: 'secret',
      });
      vi.spyOn(argon2, 'verify').mockResolvedValue(false);

      await expect(
        authService.login(db, { email: 'test@example.com', password: 'wrong' })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw Unauthorized if user does not exist', async () => {
      const verifySpy = vi.spyOn(argon2, 'verify').mockResolvedValue(false);

      await expect(
        authService.login(db, { email: 'nope@test.com', password: 'pass' })
      ).rejects.toThrow('Invalid email or password');

      // Should still call verify with dummy hash to mitigate timing attacks
      expect(verifySpy).toHaveBeenCalledWith(authService.DUMMY_HASH, 'pass');
    });
  });

  describe('verifyPassword', () => {
    it('should return false if argon2 throws', async () => {
      vi.spyOn(argon2, 'verify').mockRejectedValue(new Error('boom'));

      const result = await authService.verifyPassword('bad-hash', 'pass');
      expect(result).toBe(false);
    });
  });
});
