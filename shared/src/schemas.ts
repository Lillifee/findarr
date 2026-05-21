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
  PORT: z.coerce.number().int().min(1).max(65_535).default(8585),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  DATA_PATH: z.string().default('./data'),
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
  page: z.coerce.number().int().min(1).max(1000).default(1).optional(),
  action: z.enum(['all', 'liked', 'disliked']).default('all').optional(),
  type: z.enum(['movie', 'tv', 'both']).default('both').optional(),
});

export const AvailableMediaQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1).optional(),
  type: z.enum(['movie', 'tv', 'both']).default('both').optional(),
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
// Admin / Integration Schemas (TMDB, Radarr, Sonarr, Jellyfin)
// ============================================================================

/** Request body for PUT /admin/tmdb/settings */
export const TmdbSettingsQuerySchema = z.object({
  tmdbAccessToken: z.string().min(1).optional(),
});

/** Request body for PUT /admin/radarr/settings and PUT /admin/sonarr/settings */
export const ArrSettingsQuerySchema = z.object({
  url: z.string().optional(),
  apiKey: z.string().optional(),
  qualityProfileId: z.coerce.number().int().positive().optional(),
  rootFolderPath: z.string().min(1).optional(),
});

/** Backward-compatible aliases for ARR service-specific naming */
export const RadarrSettingsQuerySchema = ArrSettingsQuerySchema;
export const SonarrSettingsQuerySchema = ArrSettingsQuerySchema;

/** Request body for PUT /admin/jellyfin/settings */
export const JellyfinSettingsQuerySchema = z.object({
  jellyfinUrl: z.string().optional(),
  jellyfinApiKey: z.string().optional(),
});

/** Response shape for GET /admin/tmdb/settings */
export const TmdbSettingsSchema = z.object({
  tmdbAccessTokenSet: z.boolean(),
});

/** Response shape for GET /admin/radarr/settings and GET /admin/sonarr/settings */
export const ArrSettingsSchema = z.object({
  url: z.string().nullable(),
  apiKeySet: z.boolean(),
  qualityProfileId: z.number().int().nullable(),
  rootFolderPath: z.string().nullable(),
});

/** Backward-compatible aliases for ARR service-specific naming */
export const RadarrSettingsSchema = ArrSettingsSchema;
export const SonarrSettingsSchema = ArrSettingsSchema;

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

export type TmdbSettingsQuery = z.infer<typeof TmdbSettingsQuerySchema>;
export type TmdbSettings = z.infer<typeof TmdbSettingsSchema>;

export type ArrSettingsQuery = z.infer<typeof ArrSettingsQuerySchema>;
export type ArrSettings = z.infer<typeof ArrSettingsSchema>;
export type RadarrSettingsQuery = ArrSettingsQuery;
export type SonarrSettingsQuery = ArrSettingsQuery;
export type RadarrSettings = ArrSettings;
export type SonarrSettings = ArrSettings;
export type ArrQualityProfile = z.infer<typeof ArrQualityProfileSchema>;
export type ArrRootFolder = z.infer<typeof ArrRootFolderSchema>;
export type ArrLinkQuery = z.infer<typeof ArrLinkQuerySchema>;

export type JellyfinSettingsQuery = z.infer<typeof JellyfinSettingsQuerySchema>;
export type JellyfinSettings = z.infer<typeof JellyfinSettingsSchema>;
export type JellyfinLinkQuery = z.infer<typeof JellyfinLinkQuerySchema>;

export type UserSettingsQuery = z.infer<typeof UserSettingsQuerySchema>;
export type UserSettings = z.infer<typeof UserSettingsSchema>;

export type SchedulerParams = z.infer<typeof SchedulerParamsSchema>;
