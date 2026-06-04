import { hash, verify } from '@node-rs/argon2';

// ============================================================================
// Password Utilities
// ============================================================================

export const hashPassword = async (password: string) =>
  hash(password, { memoryCost: 19_456, timeCost: 2, parallelism: 1 });

export const verifyPassword = async (hashStr: string, password: string) =>
  verify(hashStr, password).catch(() => false);
