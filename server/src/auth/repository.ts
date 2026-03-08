import type { CreateUser, User } from '@findarr/shared';
import { users } from '@findarr/shared';
import { eq } from 'drizzle-orm';
import type { DB } from '../db/setup.js';
import { BadRequest, Forbidden, NotFound } from '../utils/errors.js';
import { hashPassword } from './service.js';

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
  db: DB,
  email: string
): Promise<UserWithPassword | undefined> => {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  return user;
};

export const getUserById = async (db: DB, id: number): Promise<UserWithPassword | undefined> => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });
  return user;
};

export const listAllUsers = async (db: DB) =>
  db.query.users.findMany({
    columns: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      createdAt: true,
    },
    orderBy: (users, { asc }) => [asc(users.createdAt)],
  });

// ============================================================================
// Create / Update Operations
// ============================================================================

export const createUser = async (db: DB, { email, password, displayName, role }: CreateUser) => {
  // Check if user already exists
  const existingUser = await getUserByEmail(db, email);

  if (existingUser) {
    throw BadRequest('User with this email already exists');
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
    throw NotFound('User could not be created');
  }

  return user;
};

// ============================================================================
// Delete Operations
// ============================================================================

export const deleteUser = async (db: DB, id: number, curUserId?: number) => {
  // Prevent deleting yourself
  if (curUserId === id) {
    throw Forbidden('Cannot delete your own account');
  }

  const result = await db.delete(users).where(eq(users.id, id));

  if (result.changes === 0) {
    throw NotFound('User not found');
  }
};

// ============================================================================
// Utility Functions
// ============================================================================

export const removePasswordHash = (user: UserWithPassword): User => {
  const { passwordHash: _hash, ...userWithoutPassword } = user;
  return userWithoutPassword;
};
