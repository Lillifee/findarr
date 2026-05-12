import type { MediaType } from '@findarr/shared';
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

// Radarr movie object from GET /api/v3/movie
export const RadarrMovieSchema = z
  .object({
    id: z.number(),
    tmdbId: z.number(),
    title: z.string(),
    year: z.number().optional(),
    monitored: z.boolean(),
    hasFile: z.boolean(),
    isAvailable: z.boolean().optional(),
    sizeOnDisk: z.number().optional(),
  })
  .transform(data => ({ ...data, type: 'movie' as const }));

// Sonarr season object from GET /api/v3/series
export const SonarrSeasonSchema = z.object({
  seasonNumber: z.number(),
  monitored: z.boolean(),
  statistics: z
    .object({
      episodeFileCount: z.number().optional(),
      episodeCount: z.number().optional(),
      totalEpisodeCount: z.number().optional(),
      sizeOnDisk: z.number().optional(),
      percentOfEpisodes: z.number().optional(),
    })
    .optional(),
});

// Sonarr series object from GET /api/v3/series
export const SonarrSeriesSchema = z
  .object({
    id: z.number(),
    tvdbId: z.number(),
    title: z.string(),
    titleSlug: z.string().optional(),
    year: z.number().optional(),
    monitored: z.boolean(),
    seasonFolder: z.boolean().optional(),
    seasons: z.array(SonarrSeasonSchema).optional(),
    statistics: z
      .object({
        seasonCount: z.number().optional(),
        episodeFileCount: z.number().optional(),
        episodeCount: z.number().optional(),
        totalEpisodeCount: z.number().optional(),
        sizeOnDisk: z.number().optional(),
        percentOfEpisodes: z.number().optional(),
      })
      .optional(),
  })
  .transform(data => ({ ...data, type: 'tv' as const }));

// Base queue item fields shared between Radarr and Sonarr
const BaseQueueItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  status: z.string(),
  trackedDownloadStatus: z.string().optional(),
  trackedDownloadState: z.string().optional(),
  statusMessages: z.array(z.unknown()).optional(),
  errorMessage: z.string().optional(),
  downloadId: z.string().optional(),
  protocol: z.string().optional(),
  size: z.number().optional(),
  sizeleft: z.number().optional(),
  timeleft: z.string().optional(),
});

// Radarr queue item from GET /api/v3/queue
export const RadarrQueueItemSchema = BaseQueueItemSchema.extend({
  movieId: z.number().optional(),
})
  .refine(data => data.movieId !== undefined, {
    message: 'Must have movieId for Radarr queue item',
  })
  .transform(data => ({
    ...data,
    type: 'movie' as const,
    arrId: data.movieId,
  }));

// Sonarr queue item from GET /api/v3/queue
export const SonarrQueueItemSchema = BaseQueueItemSchema.extend({
  seriesId: z.number().optional(),
})
  .refine(data => data.seriesId !== undefined, {
    message: 'Must have seriesId for Sonarr queue item',
  })
  .transform(data => ({
    ...data,
    type: 'tv' as const,
    arrId: data.seriesId,
  }));

// Unified queue response schema for both Radarr and Sonarr
export const ArrQueueResponseSchema = z.object({
  page: z.number().optional(),
  pageSize: z.number().optional(),
  sortKey: z.string().optional(),
  sortDirection: z.string().optional(),
  totalRecords: z.number().optional(),
  records: z.array(z.union([RadarrQueueItemSchema, SonarrQueueItemSchema])),
});

export type RadarrMovie = z.infer<typeof RadarrMovieSchema>;
export type SonarrSeries = z.infer<typeof SonarrSeriesSchema>;
export type SonarrSeason = z.infer<typeof SonarrSeasonSchema>;
export type ArrQueueResponse = z.infer<typeof ArrQueueResponseSchema>;

/**
 * Unified library item for both Radarr (movies) and Sonarr (TV shows)
 * This is the transformed type used internally after validating API responses
 * No Zod schema needed - created via transformers from validated RadarrMovie/SonarrSeries
 */
export interface ArrLibraryItem {
  id: number; // Radarr movie ID or Sonarr series ID
  type: MediaType; // Discriminator for type-safe unions
  title: string;
  tmdbId?: number; // TMDB ID (always present for movies, added via enrichment for TV)
  tvdbId?: number; // TVDB ID (only for TV shows)
  arrUrl?: string; // Relative UI path (e.g. /movie/:tmdbId, /series/:titleSlug)
  year?: number | undefined;
  monitored: boolean;
  hasFile: boolean; // Computed from hasFile (Radarr) or statistics.episodeFileCount > 0 (Sonarr)
  seasons?: Array<{
    // Only for TV shows - season tracking from Sonarr
    seasonNumber: number;
    status: 'none' | 'monitored' | 'downloaded';
  }>;
}
