import { z } from 'zod';
import { genreKeys, regionGroupKeys } from './constants.js';

const arrayParam = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(val => {
    if (typeof val === 'string') return val === '' ? [] : [val];
    if (Array.isArray(val)) return val;
    return [];
  }, schema);

// ============================================================================
// Server environment ENV Schemas
// ============================================================================

export const ServerEnvSchema = z.object({
  TMDB_ACCESS_TOKEN: z.string(),
  SESSION_SECRET: z.string().min(32),
  TMDB_BASE_URL: z.url().default('https://api.themoviedb.org/3'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  DB_PATH: z.string().default('./data/findarr.db'),
  ADMIN_EMAIL: z.email().default('admin@findarr.local'),
  ADMIN_PASSWORD: z.string().default('changeme'),
});

// ============================================================================
// Media Request Validation Schemas
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

// ============================================================================
// Authentication Schemas
// ============================================================================

export const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const UserSchema = z.object({
  id: z.coerce.number().int().positive(),
  email: z.email(),
  display_name: z.string(),
  role: z.enum(['user', 'admin']),
  created_at: z.number(),
});

export const CreateUserSchema = z.object({
  email: z.email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(1),
  role: z.enum(['user', 'admin']).default('user'),
});

export const DeleteUserSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// ============================================================================
// Media Request Schemas
// ============================================================================

export const CreateMediaRequestSchema = z.object({
  mediaType: z.enum(['movie', 'tv']),
  tmdbId: z.number().int().positive(),
  title: z.string().min(1),
  posterPath: z.string().nullish(),
});

export const UpdateRequestStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'available']),
});

export const RequestIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});
