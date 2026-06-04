import type { ChangePassword, Login, SetupInitialPassword, User } from '@findarr/shared/auth';

import type { Database } from '../db/service.js';
import { forbidden, unauthorized } from '../utils/errors.js';
import {
  getUserByEmail,
  getUserById,
  removePasswordHash,
  updateUserPassword,
} from './repository.js';
import { verifyPassword } from './utils.js';

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
    throw unauthorized('Invalid email or password');
  }

  return removePasswordHash(user);
};

export const isAdminPasswordSetupRequired = async (user: UserWithPassword) =>
  user.role === 'admin' && verifyPassword(user.passwordHash, 'changeme');

export const isPasswordSetupRequired = async (db: Database, userId: number) => {
  const user = await getUserById(db, userId);

  if (!user) {
    throw unauthorized('Authentication required');
  }

  const setupRequired = await isAdminPasswordSetupRequired(user);
  return setupRequired;
};

export const changePassword = async (
  db: Database,
  userId: number,
  { currentPassword, newPassword }: ChangePassword,
) => {
  const user = await getUserById(db, userId);

  if (!user) {
    throw unauthorized('Authentication required');
  }

  const isCurrentPasswordValid = await verifyPassword(user.passwordHash, currentPassword);
  if (!isCurrentPasswordValid) {
    throw unauthorized('Current password is incorrect');
  }

  await updateUserPassword(db, user.id, newPassword);
};

export const setupInitialPassword = async (
  db: Database,
  userId: number,
  { newPassword }: SetupInitialPassword,
) => {
  const user = await getUserById(db, userId);

  if (!user) {
    throw unauthorized('Authentication required');
  }

  if (user.role !== 'admin') {
    throw forbidden('Admin access required');
  }

  const setupRequired = await isAdminPasswordSetupRequired(user);
  if (!setupRequired) {
    throw forbidden('Admin password is already set up');
  }

  await updateUserPassword(db, user.id, newPassword);
};
