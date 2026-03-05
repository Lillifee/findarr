import type { CreateUser, User } from '@findarr/shared';
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
// Create / Update Operations
// ============================================================================

export const createUser = async (db: DB, { email, password, displayName, role }: CreateUser) => {
  // Check if user already exists
  const existingUser = getUserByEmail(db, email);

  if (existingUser) {
    throw BadRequest('User with this email already exists');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  const stmt = db.prepare(`
    INSERT INTO users (email, passwordHash, displayName, role)
    VALUES (?, ?, ?, ?)
  `);

  const result = stmt.run(email, passwordHash, displayName, role);
  const id = result.lastInsertRowid as number;

  // Retrieve the created user to get database-generated values
  return getUserById(db, id);
};

// ============================================================================
// Read / Query Operations
// ============================================================================

export const getUserByEmail = (db: DB, email: string) =>
  db.prepare<[string], UserWithPassword>(`SELECT * FROM users WHERE email = ?`).get(email);

export const getUserById = (db: DB, id: number) => {
  const stmt = db.prepare<[number], User>(
    `SELECT id, email, displayName, role, createdAt FROM users WHERE id = ?`
  );

  return stmt.get(id);
};

export const listAllUsers = (db: DB): User[] => {
  const stmt = db.prepare<[], User>(`
    SELECT id, email, displayName, role, createdAt FROM users
    ORDER BY createdAt DESC
  `);

  return stmt.all();
};

// ============================================================================
// Delete Operations
// ============================================================================

export const deleteUser = (db: DB, id: number, curUserId?: number) => {
  // Prevent deleting yourself
  if (curUserId === id) {
    throw Forbidden('Cannot delete your own account');
  }

  const result = db.prepare(`DELETE FROM users WHERE id = ?`).run(id);

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
