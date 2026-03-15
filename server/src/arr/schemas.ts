import { z } from 'zod';
export {
  ArrQualityProfileSchema,
  ArrRootFolderSchema,
  type ArrQualityProfile,
  type ArrRootFolder,
} from '@findarr/shared';

// Shared response schemas — identical structure across Radarr and Sonarr

export const ArrSystemStatusSchema = z.object({
  version: z.string(),
  appName: z.string().optional(),
});

// Radarr-specific response for POST /api/v3/movie
export const RadarrAddMovieResponseSchema = z.object({
  id: z.number(),
  tmdbId: z.number(),
  title: z.string(),
});

// Sonarr-specific response for POST /api/v3/series
export const SonarrAddSeriesResponseSchema = z.object({
  id: z.number(),
  tvdbId: z.number(),
  title: z.string(),
});

export type RadarrAddMovieResponse = z.infer<typeof RadarrAddMovieResponseSchema>;
export type SonarrAddSeriesResponse = z.infer<typeof SonarrAddSeriesResponseSchema>;
