import type { Login, User } from '@findarr/shared';
import { hash, verify } from '@node-rs/argon2';
import type { DB } from '../db/setup.js';
import { Unauthorized } from '../utils/errors.js';
import { getUserByEmail, removePasswordHash } from './repository.js';

export interface UserWithPassword extends User {
  passwordHash: string;
}

export const DUMMY_HASH = '$argon2id$v=19$m=65536,t=3,p=4$C29tZVNhbHQ$C29tZUhBU0g';

// ============================================================================
// Authentication
// ============================================================================

export const login = async (db: DB, { email, password }: Login) => {
  const user = await getUserByEmail(db, email);

  const passwordHash = user?.passwordHash ?? DUMMY_HASH;
  const isValid = await verifyPassword(passwordHash, password);

  if (!user || !isValid) {
    throw Unauthorized('Invalid email or password');
  }

  return removePasswordHash(user);
};

// ============================================================================
// Password Utilities
// ============================================================================

export const hashPassword = (password: string) =>
  hash(password, { memoryCost: 19_456, timeCost: 2, parallelism: 1 });

export const verifyPassword = (hashStr: string, password: string) =>
  verify(hashStr, password).catch(() => false);
