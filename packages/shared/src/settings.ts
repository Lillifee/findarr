import { z } from 'zod';

import { regionGroupKeys } from './constants.js';

// ============================================================================
// User Settings Schemas
// ============================================================================

export const UserSettingsSchema = z.object({
  language: z.string(),
  regions: z.array(z.enum(regionGroupKeys)),
  swipeLimit: z.number().int().min(60).max(240),
});

export const UserSettingsQuerySchema = UserSettingsSchema.partial();

export const DEFAULT_USER_SETTINGS: UserSettings = {
  language: 'en-US',
  regions: ['western'],
  swipeLimit: 100,
};

// ============================================================================
// Link Schemas (Radarr/Sonarr/Jellyfin)
// ============================================================================

export const ArrLinkQuerySchema = z.object({
  mediaId: z.coerce.number().int().positive(),
});

export const JellyfinLinkQuerySchema = z.object({
  mediaId: z.coerce.number().int().positive(),
});

// ============================================================================
// Integration Settings Schemas (TMDB, Radarr, Sonarr, Jellyfin)
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

export type UserSettingsQuery = z.infer<typeof UserSettingsQuerySchema>;
export type UserSettings = z.infer<typeof UserSettingsSchema>;

export type ArrLinkQuery = z.infer<typeof ArrLinkQuerySchema>;
export type JellyfinLinkQuery = z.infer<typeof JellyfinLinkQuerySchema>;

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

export type JellyfinSettingsQuery = z.infer<typeof JellyfinSettingsQuerySchema>;
export type JellyfinSettings = z.infer<typeof JellyfinSettingsSchema>;
