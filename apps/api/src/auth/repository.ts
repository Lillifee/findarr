import type { CreateUser, User } from '@findarr/shared/auth';
import { users } from '@findarr/shared/db';
import { eq } from 'drizzle-orm';

import type { Database } from '../db/service.js';
import { badRequest, forbidden, notFound } from '../utils/errors.js';
import { hashPassword } from './utils.js';

// ============================================================================
// Types
// ============================================================================

export interface UserWithPassword extends User {
  passwordHash: string;
}

// ============================================================================
// Read Operations
// ============================================================================

export const getUserByEmail = async (
  db: Database,
  email: string,
): Promise<UserWithPassword | undefined> => {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  return user;
};

export const getUserById = async (
  db: Database,
  id: number,
): Promise<UserWithPassword | undefined> => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });
  return user;
};

export const listAllUsers = (db: Database) =>
  db.query.users.findMany({
    columns: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      createdAt: true,
    },
    orderBy: (usr, { asc }) => [asc(usr.createdAt)],
  });

// ============================================================================
// Create / Update Operations
// ============================================================================

export const createUser = async (
  db: Database,
  { email, password, displayName, role }: CreateUser,
) => {
  // Check if user already exists
  const existingUser = await getUserByEmail(db, email);

  if (existingUser) {
    throw badRequest('User with this email already exists');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      displayName,
      role,
    })
    .returning();

  if (!user) {
    throw notFound('User could not be created');
  }

  return user;
};

export const updateUserPassword = async (db: Database, userId: number, password: string) => {
  const passwordHash = await hashPassword(password);

  const result = await db.update(users).set({ passwordHash }).where(eq(users.id, userId));

  if (result.changes === 0) {
    throw notFound('User not found');
  }
};

// ============================================================================
// Delete Operations
// ============================================================================

export const deleteUser = async (db: Database, id: number, curUserId: number) => {
  // Prevent deleting yourself
  if (curUserId === id) {
    throw forbidden('Cannot delete your own account');
  }

  const result = await db.delete(users).where(eq(users.id, id));

  if (result.changes === 0) {
    throw notFound('User not found');
  }
};

// ============================================================================
// Utility Functions
// ============================================================================

export const removePasswordHash = (user: UserWithPassword): User => {
  const { passwordHash: _hash, ...userWithoutPassword } = user;
  return userWithoutPassword;
};
