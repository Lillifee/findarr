import type { ChangePassword, Login, SetupInitialPassword, User } from '@findarr/shared';
import { hash, verify } from '@node-rs/argon2';
import type { Database } from '../db/service.js';
import { Forbidden, Unauthorized } from '../utils/errors.js';
import {
  getUserByEmail,
  getUserById,
  removePasswordHash,
  updateUserPassword,
} from './repository.js';

export interface UserWithPassword extends User {
  passwordHash: string;
}

export const DUMMY_HASH = '$argon2id$v=19$m=65536,t=3,p=4$C29tZVNhbHQ$C29tZUhBU0g';

// ============================================================================
// Authentication
// ============================================================================

export const login = async (db: Database, { email, password }: Login) => {
  const user = await getUserByEmail(db, email);

  const passwordHash = user?.passwordHash ?? DUMMY_HASH;
  const isValid = await verifyPassword(passwordHash, password);

  if (!user || !isValid) {
    throw Unauthorized('Invalid email or password');
  }

  return removePasswordHash(user);
};

export const isPasswordSetupRequired = async (db: Database, userId: number) => {
  const user = await getUserById(db, userId);

  if (!user) {
    throw Unauthorized('Authentication required');
  }

  return await isAdminPasswordSetupRequired(user);
};

export const isAdminPasswordSetupRequired = async (user: UserWithPassword) =>
  user.role === 'admin' && verifyPassword(user.passwordHash, 'changeme');

export const changePassword = async (
  db: Database,
  userId: number,
  { currentPassword, newPassword }: ChangePassword
) => {
  const user = await getUserById(db, userId);

  if (!user) {
    throw Unauthorized('Authentication required');
  }

  const isCurrentPasswordValid = await verifyPassword(user.passwordHash, currentPassword);
  if (!isCurrentPasswordValid) {
    throw Unauthorized('Current password is incorrect');
  }

  await updateUserPassword(db, user.id, newPassword);
};

export const setupInitialPassword = async (
  db: Database,
  userId: number,
  { newPassword }: SetupInitialPassword
) => {
  const user = await getUserById(db, userId);

  if (!user) {
    throw Unauthorized('Authentication required');
  }

  if (user.role !== 'admin') {
    throw Forbidden('Admin access required');
  }

  const setupRequired = await isAdminPasswordSetupRequired(user);
  if (!setupRequired) {
    throw Forbidden('Admin password is already set up');
  }

  await updateUserPassword(db, user.id, newPassword);
};

// ============================================================================
// Password Utilities
// ============================================================================

export const hashPassword = (password: string) =>
  hash(password, { memoryCost: 19_456, timeCost: 2, parallelism: 1 });

export const verifyPassword = (hashStr: string, password: string) =>
  verify(hashStr, password).catch(() => false);
