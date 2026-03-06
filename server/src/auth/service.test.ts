import * as argon2 from '@node-rs/argon2';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockDb, createTestUser } from '../utils/testHelper.js';
import * as userService from './repository.js';
import type { UserWithPassword } from './repository.js';
import { login, DUMMY_HASH, verifyPassword } from './service.js';

vi.mock('@node-rs/argon2');

describe('auth service', () => {
  const userWithPassword: UserWithPassword = { ...createTestUser(), passwordHash: 'hashed' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should return user without password on valid credentials', async () => {
      vi.spyOn(userService, 'getUserByEmail').mockReturnValue(userWithPassword);
      vi.spyOn(argon2, 'verify').mockResolvedValue(true);

      const result = await login(mockDb, {
        email: 'test@example.com',
        password: 'password',
      });

      const { passwordHash: _hash, ...expectedUser } = userWithPassword;
      expect(result).toEqual(expectedUser);
    });

    it('should throw Unauthorized for wrong password', async () => {
      vi.spyOn(userService, 'getUserByEmail').mockReturnValue(userWithPassword);
      vi.spyOn(argon2, 'verify').mockResolvedValue(false);

      await expect(login(mockDb, { email: 'test@example.com', password: 'wrong' })).rejects.toThrow(
        'Invalid email or password'
      );
    });

    it('should throw Unauthorized if user does not exist', async () => {
      vi.spyOn(userService, 'getUserByEmail').mockReturnValue(undefined);
      const verifySpy = vi.spyOn(argon2, 'verify').mockResolvedValue(false);

      await expect(login(mockDb, { email: 'nope@test.com', password: 'pass' })).rejects.toThrow(
        'Invalid email or password'
      );

      // Should still call verify with dummy hash to mitigate timing attacks
      expect(verifySpy).toHaveBeenCalledWith(DUMMY_HASH, 'pass');
    });
  });

  describe('verifyPassword', () => {
    it('should return false if argon2 throws', async () => {
      vi.spyOn(argon2, 'verify').mockRejectedValue(new Error('boom'));

      const result = await verifyPassword('bad-hash', 'pass');
      expect(result).toBe(false);
    });
  });
});
