import type { CreateUser, User } from '@findarr/shared';
import type { Statement } from 'better-sqlite3';
import { describe, it, expect, beforeEach, vi, type Mocked } from 'vitest';
import type { DB } from '../db/setup.js';
import * as authService from './auth.js';
import {
  createUser,
  getUserByEmail,
  getUserById,
  listAllUsers,
  deleteUser,
  removePasswordHash,
  type UserWithPassword,
} from './user.js';

// -----------------------------------------------------------------------------
// Mocks
// -----------------------------------------------------------------------------

const mockCreateUser: CreateUser = {
  email: 'test@example.com',
  password: 'secret',
  displayName: 'Test User',
  role: 'user',
};

const fakeUser: User = {
  id: 1,
  email: 'test@example.com',
  displayName: 'Test User',
  role: 'user',
  createdAt: Date.now(),
};

const fakeUserWithPassword: UserWithPassword = {
  ...fakeUser,
  passwordHash: 'hashed-password',
};

describe('user service', () => {
  let stmtMock: Mocked<Partial<Statement<CreateUser>>>;
  let dbMock: DB;

  beforeEach(() => {
    vi.clearAllMocks();

    stmtMock = {
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn(),
    };

    dbMock = {
      prepare: vi.fn().mockReturnValue(stmtMock),
    } as unknown as DB;
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      // first getUserByEmail → undefined (no existing user)
      stmtMock.get = vi
        .fn()
        .mockReturnValueOnce(undefined) // getUserByEmail
        .mockReturnValueOnce(fakeUser); // getUserById

      stmtMock.run = vi.fn().mockReturnValue({ lastInsertRowid: 1 });

      vi.spyOn(authService, 'hashPassword').mockResolvedValue('hashed-password');

      const result = await createUser(dbMock, mockCreateUser);

      expect(authService.hashPassword).toHaveBeenCalledWith('secret');
      expect(stmtMock.run).toHaveBeenCalled();
      expect(result).toEqual(fakeUser);
    });

    it('should throw if user already exists', async () => {
      stmtMock.get = vi.fn().mockReturnValue(fakeUserWithPassword);

      await expect(createUser(dbMock, mockCreateUser)).rejects.toThrow(
        'User with this email already exists'
      );
    });
  });

  describe('getUserByEmail', () => {
    it('should return user with password', () => {
      stmtMock.get = vi.fn().mockReturnValue(fakeUserWithPassword);
      const result = getUserByEmail(dbMock, 'test@example.com');
      expect(stmtMock.get).toHaveBeenCalledWith('test@example.com');
      expect(result).toEqual(fakeUserWithPassword);
    });
  });

  describe('getUserById', () => {
    it('should return user without password', () => {
      stmtMock.get = vi.fn().mockReturnValue(fakeUser);
      const result = getUserById(dbMock, 1);
      expect(stmtMock.get).toHaveBeenCalledWith(1);
      expect(result).toEqual(fakeUser);
    });
  });

  describe('listAllUsers', () => {
    it('should return all users', () => {
      stmtMock.all = vi.fn().mockReturnValue([fakeUser]);
      const result = listAllUsers(dbMock);
      expect(stmtMock.all).toHaveBeenCalled();
      expect(result).toEqual([fakeUser]);
    });
  });

  describe('deleteUser', () => {
    it('should delete user if exists', () => {
      stmtMock.run = vi.fn().mockReturnValue({ changes: 1 });
      deleteUser(dbMock, 1, 2);
      expect(stmtMock.run).toHaveBeenCalledWith(1);
    });

    it('should throw if trying to delete yourself', () => {
      expect(() => deleteUser(dbMock, 1, 1)).toThrow('Cannot delete your own account');
    });

    it('should throw if user not found', () => {
      stmtMock.run = vi.fn().mockReturnValue({ changes: 0 });
      expect(() => deleteUser(dbMock, 999, 2)).toThrow('User not found');
    });
  });

  describe('removePasswordHash', () => {
    it('should remove passwordHash from user object', () => {
      const result = removePasswordHash(fakeUserWithPassword);
      expect(result).toEqual(fakeUser);
      expect((result as UserWithPassword).passwordHash).toBeUndefined();
    });
  });
});
