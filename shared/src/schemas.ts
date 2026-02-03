import { z } from 'zod';

/**
 * Shared validation schemas for API requests
 * Application types (Movie, TVShow, etc.) are in types/media.ts
 * TMDB API schemas are in server/src/schemas/tmdb.ts
 */

// Server environment schema
export const ServerEnvSchema = z.object({
  TMDB_ACCESS_TOKEN: z.string(),
  TMDB_BASE_URL: z.url().default('https://api.themoviedb.org/3'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
});

// ============================================================================
// Request Validation Schemas
// ============================================================================

const BaseQuerySchema = z.object({
  language: z.string().optional(),
});

export const SearchQuerySchema = BaseQuerySchema.extend({
  query: z.string().min(1),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  type: z.enum(['movie', 'tv', 'both']).default('both'),
});

// Application-level region group IDs (mapping to TMDB handled server-side)
export type RegionGroupId =
  | 'western'
  | 'eastern-europe'
  | 'asian'
  | 'latin-america'
  | 'middle-east-africa';

// Application-level discover query (clean, minimal)
export const DiscoverQuerySchema = BaseQuerySchema.extend({
  page: z.coerce.number().int().min(1).max(1000).optional(),
  type: z.enum(['movie', 'tv', 'both']).optional(),

  // Recent content filter - number of days to look back
  recent_days: z.coerce.number().int().min(1).max(3650).optional(), // Max 10 years

  // Region-based filtering (client sends IDs, server handles TMDB mapping)
  region_groups: z
    .preprocess(
      val => {
        if (typeof val === 'string') return val === '' ? [] : [val];
        if (Array.isArray(val)) return val;
        return [];
      },
      z.array(z.enum(['western', 'eastern-europe', 'asian', 'latin-america', 'middle-east-africa']))
    )
    .default([])
    .optional(),

  // Genre filtering
  with_genres: z.string().optional(), // comma-separated genre IDs
});

export const DetailsQuerySchema = BaseQuerySchema.extend({
  id: z.coerce.number().int().positive(),
  type: z.enum(['movie', 'tv']),
});

export const GenresQuerySchema = z.object({
  type: z.enum(['movie', 'tv']),
});
