import type { CreateUser } from '@findarr/shared';
import SqlDatabase from 'better-sqlite3';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SCHEMA, type DB } from '../db/setup.js';
import { createTestUserInDb } from '../utils/testHelper.js';
import {
  createUser,
  getUserByEmail,
  getUserById,
  listAllUsers,
  deleteUser,
  removePasswordHash,
  type UserWithPassword,
} from './repository.js';
import * as authService from './service.js';

describe('auth repository', () => {
  let db: DB;

  beforeEach(() => {
    db = new SqlDatabase(':memory:');
    db.pragma('foreign_keys = ON');
    db.exec(SCHEMA);

    // Mock password hashing for speed - we're testing DB operations, not crypto
    vi.spyOn(authService, 'hashPassword').mockResolvedValue('hashed-password');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    db.close();
  });

  describe('createUser', () => {
    it('should create a new user with hashed password', async () => {
      const userData: CreateUser = {
        email: 'test@example.com',
        password: 'secret',
        displayName: 'Test User',
        role: 'user',
      };

      const result = await createUser(db, userData);

      expect(authService.hashPassword).toHaveBeenCalledWith('secret');
      expect(result).toBeDefined();
      if (!result) return;

      expect(result.email).toBe('test@example.com');
      expect(result.displayName).toBe('Test User');
      expect(result.role).toBe('user');
      expect(result.id).toBe(1);
      expect(result.createdAt).toBeDefined();

      // Verify user was actually created in database
      const userInDb = getUserByEmail(db, 'test@example.com');
      expect(userInDb).toBeDefined();
      expect(userInDb?.passwordHash).toBe('hashed-password');
    });

    it('should throw if user already exists', async () => {
      const userData: CreateUser = {
        email: 'test@example.com',
        password: 'secret',
        displayName: 'Test User',
        role: 'user',
      };

      await createUser(db, userData);

      await expect(createUser(db, userData)).rejects.toThrow('User with this email already exists');
    });

    it('should create users with auto-incremented IDs', async () => {
      const user1 = await createUser(db, {
        email: 'user1@test.com',
        password: 'pass1',
        displayName: 'User 1',
        role: 'user',
      });

      const user2 = await createUser(db, {
        email: 'user2@test.com',
        password: 'pass2',
        displayName: 'User 2',
        role: 'admin',
      });

      expect(user1?.id).toBe(1);
      expect(user2?.id).toBe(2);
      expect(user2?.role).toBe('admin');
    });
  });

  describe('getUserByEmail', () => {
    it('should return user with password hash', async () => {
      await createUser(db, {
        email: 'test@example.com',
        password: 'secret',
        displayName: 'Test User',
        role: 'user',
      });

      const result = getUserByEmail(db, 'test@example.com');

      expect(result).toBeDefined();
      if (!result) return;
      expect(result.email).toBe('test@example.com');
      expect(result.displayName).toBe('Test User');
      expect(result.passwordHash).toBe('hashed-password');
    });

    it('should return undefined for non-existent user', () => {
      const result = getUserByEmail(db, 'nonexistent@example.com');
      expect(result).toBeUndefined();
    });

    it('should be case-sensitive for email', async () => {
      await createUser(db, {
        email: 'test@example.com',
        password: 'secret',
        displayName: 'Test User',
        role: 'user',
      });

      const result = getUserByEmail(db, 'TEST@example.com');
      expect(result).toBeUndefined();
    });
  });

  describe('getUserById', () => {
    it('should return user without password hash', async () => {
      const created = await createTestUserInDb(db, {
        email: 'test@example.com',
        displayName: 'Test User',
      });

      const result = getUserById(db, created.id);

      expect(result).toBeDefined();
      if (!result) return;
      expect(result.email).toBe('test@example.com');
      expect(result.displayName).toBe('Test User');
      expect((result as UserWithPassword).passwordHash).toBeUndefined();
    });

    it('should return undefined for non-existent ID', () => {
      const result = getUserById(db, 999);
      expect(result).toBeUndefined();
    });
  });

  describe('listAllUsers', () => {
    it('should return all users without password hashes', async () => {
      await createTestUserInDb(db, { email: 'user1@test.com', displayName: 'User 1' });
      await createTestUserInDb(db, {
        email: 'user2@test.com',
        displayName: 'User 2',
        role: 'admin',
      });

      const result = listAllUsers(db);

      expect(result).toHaveLength(2);
      expect(result[0]?.email).toBe('user1@test.com');
      expect(result[1]?.email).toBe('user2@test.com');
      expect((result[0] as UserWithPassword).passwordHash).toBeUndefined();
    });

    it('should return empty array when no users exist', () => {
      const result = listAllUsers(db);
      expect(result).toEqual([]);
    });
  });

  describe('deleteUser', () => {
    it('should delete user if exists', async () => {
      const user = await createTestUserInDb(db);

      if (!user) throw new Error('User creation failed');

      deleteUser(db, user.id, 2);

      const deleted = getUserById(db, user.id);
      expect(deleted).toBeUndefined();
    });

    it('should throw if trying to delete yourself', async () => {
      const user = await createTestUserInDb(db);

      if (!user) throw new Error('User creation failed');

      expect(() => deleteUser(db, user.id, user.id)).toThrow('Cannot delete your own account');
    });

    it('should throw if user not found', () => {
      expect(() => deleteUser(db, 999, 2)).toThrow('User not found');
    });
  });

  describe('removePasswordHash', () => {
    it('should remove passwordHash from user object', () => {
      const userWithPassword: UserWithPassword = {
        id: 1,
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'user',
        createdAt: Date.now(),
        passwordHash: 'hashed-password',
      };

      const result = removePasswordHash(userWithPassword);

      expect(result.email).toBe('test@example.com');
      expect((result as UserWithPassword).passwordHash).toBeUndefined();
    });
  });
});
