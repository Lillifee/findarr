import { z } from 'zod';

import type { DbUser } from './db.js';

// ============================================================================
// User
// ============================================================================

export type User = Omit<DbUser, 'passwordHash'>;

// ============================================================================
// Bootstrap
// ============================================================================

export interface AppBootstrapStatus {
  tmdbConfigured: boolean;
  requiresPasswordSetup: boolean;
}

// ============================================================================
// Authentication Schemas
// ============================================================================

export const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const CreateUserSchema = z.object({
  email: z.email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(1),
  role: z.enum(['user', 'admin']).default('user'),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export const SetupInitialPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export const DeleteUserSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type Login = z.infer<typeof LoginSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type ChangePassword = z.infer<typeof ChangePasswordSchema>;
export type SetupInitialPassword = z.infer<typeof SetupInitialPasswordSchema>;
export type DeleteUser = z.infer<typeof DeleteUserSchema>;
