import type { ChangePassword, Login, SetupOwner, User } from '@findarr/shared/auth';

import type { Database } from '../db/service.js';
import { conflict, unauthorized } from '../utils/errors.js';
import {
  createUser,
  getUserByEmail,
  getUserById,
  hasUsers,
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

export const isOwnerSetupRequired = async (db: Database) => hasUsers(db).then((exists) => !exists);

export const setupOwner = async (db: Database, owner: SetupOwner) => {
  const ownerSetupRequired = await isOwnerSetupRequired(db);
  if (!ownerSetupRequired) {
    throw conflict('Owner account is already set up');
  }

  const user = await createUser(db, { ...owner, role: 'admin' });

  return removePasswordHash(user);
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
