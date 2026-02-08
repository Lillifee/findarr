import { z } from 'zod';
import { genreKeys, regionGroupKeys } from '.';

const arrayParam = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(val => {
    if (typeof val === 'string') return val === '' ? [] : [val];
    if (Array.isArray(val)) return val;
    return [];
  }, schema);

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

// Application-level discover query (clean, minimal)
export const DiscoverQuerySchema = BaseQuerySchema.extend({
  page: z.coerce.number().int().min(1).max(1000).optional(),
  type: z.enum(['movie', 'tv', 'both']).optional(),

  // Recent content filter - number of days to look back
  recentDays: z.coerce.number().int().min(1).max(3650).optional(), // Max 10 years

  // Region-based filtering
  regionGroups: arrayParam(z.array(z.enum(regionGroupKeys)))
    .default([])
    .optional(),

  // Genre filtering
  withGenres: arrayParam(z.array(z.enum(genreKeys)))
    .default([])
    .optional(),
});

// Popular query extends discover with required pagination
export const PopularQuerySchema = DiscoverQuerySchema.extend({});

export const DetailsQuerySchema = BaseQuerySchema.extend({
  id: z.coerce.number().int().positive(),
  type: z.enum(['movie', 'tv']),
});

export const GenresQuerySchema = z.object({
  type: z.enum(['movie', 'tv']),
});
