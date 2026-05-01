import { z } from 'zod';
import { genreKeys, regionGroupKeys } from './constants.js';

const arrayParam = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(val => {
    if (typeof val === 'string') return val ? [val] : [];
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
  JELLYFIN_SYNC_INTERVAL_MIN: z.coerce.number().int().min(1).default(30),
});

// ============================================================================
// Media Request Validation Schemas
// ============================================================================

const BaseQuerySchema = z.object({
  language: z.string().optional(),
});

const CatalogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).optional(),
  type: z.enum(['movie', 'tv', 'both']).optional(),

  // Genre filtering
  genres: arrayParam(z.array(z.enum(genreKeys)))
    .default([])
    .optional(),
});

export const SearchQuerySchema = BaseQuerySchema.extend({
  query: z.string().min(1),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  type: z.enum(['movie', 'tv', 'both']).default('both'),
});

// Application-level discover query (clean, minimal)
export const DiscoverQuerySchema = CatalogQuerySchema.extend({
  // Recent content filter - number of days to look back
  recentDays: z.coerce.number().int().min(1).max(3650).optional(), // Max 10 years
});

// Snapshot-backed popular query for infinite scrolling/load-more
export const PopularQuerySchema = CatalogQuerySchema.extend({
  feedId: z.uuid().optional(),
  interaction: z.enum(['all', 'unvoted', 'voted']).optional(),
});

export const DetailsQuerySchema = BaseQuerySchema.extend({
  id: z.coerce.number().int().positive(),
  type: z.enum(['movie', 'tv']),
});

export const ArrLinkQuerySchema = z.object({
  mediaId: z.coerce.number().int().positive(),
});

export const JellyfinLinkQuerySchema = z.object({
  mediaId: z.coerce.number().int().positive(),
});

export const GenresQuerySchema = z.object({});

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

export const DeleteUserSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// ============================================================================
// Media Interaction Schemas
// ============================================================================

export const CreateInteractionSchema = z.object({
  mediaType: z.enum(['movie', 'tv']),
  tmdbId: z.coerce.number().int().positive(),
  action: z.enum(['liked', 'disliked']),
  seasons: z.array(z.number().int().min(0)).optional(),
});

export const InteractionIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const InteractionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
});

// ============================================================================
// User Settings Schemas
// ============================================================================

export const UserSettingsSchema = z.object({
  language: z.string(),
  regions: z.array(z.enum(regionGroupKeys)),
});

export const UserSettingsQuerySchema = UserSettingsSchema.partial();

// ============================================================================
// Admin / Integration Schemas (Radarr, Sonarr, Jellyfin)
// ============================================================================

/** Request body for PUT /admin/radarr/settings */
export const RadarrSettingsQuerySchema = z.object({
  radarrUrl: z.string().optional(),
  radarrApiKey: z.string().optional(),
  radarrQualityProfileId: z.coerce.number().int().positive().optional(),
  radarrRootFolderPath: z.string().min(1).optional(),
});

/** Request body for PUT /admin/sonarr/settings */
export const SonarrSettingsQuerySchema = z.object({
  sonarrUrl: z.string().optional(),
  sonarrApiKey: z.string().optional(),
  sonarrQualityProfileId: z.coerce.number().int().positive().optional(),
  sonarrRootFolderPath: z.string().min(1).optional(),
});

/** Request body for PUT /admin/jellyfin/settings */
export const JellyfinSettingsQuerySchema = z.object({
  jellyfinUrl: z.string().optional(),
  jellyfinApiKey: z.string().optional(),
});

/** Response shape for GET /admin/radarr/settings */
export const RadarrSettingsSchema = z.object({
  radarrUrl: z.string().nullable(),
  radarrApiKeySet: z.boolean(),
  radarrQualityProfileId: z.number().int().nullable(),
  radarrRootFolderPath: z.string().nullable(),
});

/** Response shape for GET /admin/sonarr/settings */
export const SonarrSettingsSchema = z.object({
  sonarrUrl: z.string().nullable(),
  sonarrApiKeySet: z.boolean(),
  sonarrQualityProfileId: z.number().int().nullable(),
  sonarrRootFolderPath: z.string().nullable(),
});

/** Response shape for GET /admin/jellyfin/settings */
export const JellyfinSettingsSchema = z.object({
  jellyfinUrl: z.string().nullable(),
  jellyfinApiKeySet: z.boolean(),
});

/** Quality profile returned by Radarr/Sonarr */
export const ArrQualityProfileSchema = z.object({
  id: z.number(),
  name: z.string(),
});

/** Root folder returned by Radarr/Sonarr */
export const ArrRootFolderSchema = z.object({
  id: z.number(),
  path: z.string(),
  freeSpace: z.number().optional(),
});

/** Response shape for POST /admin/radarr/test and POST /admin/sonarr/test */
export const ArrTestResultSchema = z.object({
  configured: z.boolean(),
  connected: z.boolean(),
  url: z.string().nullable(),
});

/** Response shape for POST /admin/jellyfin/test */
export const JellyfinTestResultSchema = z.object({
  url: z.string().nullable(),
  connected: z.boolean(),
  apiKeySet: z.boolean(),
});

/**
 * Union type of all valid scheduler names
 */
export const SchedulerNameSchema = z.enum([
  'jellyfinLibrarySync',
  'jellyfinQueueSync',
  'radarrLibrarySync',
  'radarrQueueMonitor',
  'radarrQueueFastSync',
  'sonarrLibrarySync',
  'sonarrQueueMonitor',
  'sonarrQueueFastSync',
  'catalogCacheSync',
  'catalogKeywordEnrichment',
] as const);

export type SchedulerName = z.infer<typeof SchedulerNameSchema>;

export const SchedulerParamsSchema = z.object({
  name: SchedulerNameSchema,
});

export type RadarrSettingsQuery = z.infer<typeof RadarrSettingsQuerySchema>;
export type SonarrSettingsQuery = z.infer<typeof SonarrSettingsQuerySchema>;
export type RadarrSettings = z.infer<typeof RadarrSettingsSchema>;
export type SonarrSettings = z.infer<typeof SonarrSettingsSchema>;
export type ArrQualityProfile = z.infer<typeof ArrQualityProfileSchema>;
export type ArrRootFolder = z.infer<typeof ArrRootFolderSchema>;
export type ArrTestResult = z.infer<typeof ArrTestResultSchema>;
export type ArrLinkQuery = z.infer<typeof ArrLinkQuerySchema>;

export type JellyfinSettingsQuery = z.infer<typeof JellyfinSettingsQuerySchema>;
export type JellyfinSettings = z.infer<typeof JellyfinSettingsSchema>;
export type JellyfinTestResult = z.infer<typeof JellyfinTestResultSchema>;
export type JellyfinLinkQuery = z.infer<typeof JellyfinLinkQuerySchema>;

export type UserSettingsQuery = z.infer<typeof UserSettingsQuerySchema>;
export type UserSettings = z.infer<typeof UserSettingsSchema>;

export type SchedulerParams = z.infer<typeof SchedulerParamsSchema>;
