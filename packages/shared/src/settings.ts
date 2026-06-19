import { z } from 'zod';

import { regionGroupKeys } from './constants.js';

// ============================================================================
// User Settings Schemas
// ============================================================================

export const UserSettingsSchema = z.object({
  language: z.string(),
  uiLanguage: z.string(),
  regions: z.array(z.enum(regionGroupKeys)),
  swipeLimit: z.number().int().min(60).max(240),
});

export const UserSettingsQuerySchema = UserSettingsSchema.partial();

export const DEFAULT_USER_SETTINGS: UserSettings = {
  language: 'en-US',
  uiLanguage: 'en',
  regions: ['western'],
  swipeLimit: 100,
};

// ============================================================================
// Integration Settings Schemas (TMDB, Radarr, Sonarr, Jellyfin)
// ============================================================================

/** Request body for PUT /admin/tmdb/settings */
export const TmdbSettingsQuerySchema = z.object({
  tmdbAccessToken: z.string().min(1).optional(),
});

/** Response shape for GET /admin/tmdb/settings */
export const TmdbSettingsSchema = z.object({
  tmdbAccessTokenSet: z.boolean(),
});

/** Request body for PUT /admin/radarr/settings and PUT /admin/sonarr/settings */
export const ArrSettingsQuerySchema = z.object({
  enabled: z.boolean().optional(),
  url: z.string().optional(),
  apiKey: z.string().optional(),
  qualityProfileId: z.coerce.number().int().positive().optional(),
  rootFolderPath: z.string().min(1).optional(),
});

/** Response shape for GET /admin/radarr/settings and GET /admin/sonarr/settings */
export const ArrSettingsSchema = z.object({
  enabled: z.boolean(),
  url: z.string().nullable(),
  apiKeySet: z.boolean(),
  qualityProfileId: z.number().int().nullable(),
  rootFolderPath: z.string().nullable(),
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

/** Request body for PUT /admin/jellyfin/settings and PUT /admin/plex/settings */
export const LibSettingsQuerySchema = z.object({
  enabled: z.boolean().optional(),
  url: z.string().optional(),
  apiKey: z.string().optional(),
});

/** Response shape for GET /admin/jellyfin/settings and GET /admin/plex/settings */
export const LibSettingsSchema = z.object({
  enabled: z.boolean(),
  url: z.string().nullable(),
  apiKeySet: z.boolean(),
});

export type UserSettingsQuery = z.infer<typeof UserSettingsQuerySchema>;
export type UserSettings = z.infer<typeof UserSettingsSchema>;

export type TmdbSettingsQuery = z.infer<typeof TmdbSettingsQuerySchema>;
export type TmdbSettings = z.infer<typeof TmdbSettingsSchema>;

export type ArrSettingsQuery = z.infer<typeof ArrSettingsQuerySchema>;
export type ArrSettings = z.infer<typeof ArrSettingsSchema>;
export type ArrQualityProfile = z.infer<typeof ArrQualityProfileSchema>;
export type ArrRootFolder = z.infer<typeof ArrRootFolderSchema>;

export type LibSettingsQuery = z.infer<typeof LibSettingsQuerySchema>;
export type LibSettings = z.infer<typeof LibSettingsSchema>;
