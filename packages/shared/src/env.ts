import { z } from 'zod';

// ============================================================================
// Server Environment Schema
// ============================================================================

export const ServerEnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65_535).default(8585),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  DATA_PATH: z.string().default('./data'),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;
