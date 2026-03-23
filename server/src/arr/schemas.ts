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

// Radarr movie object from GET /api/v3/movie
export const RadarrMovieSchema = z.object({
  id: z.number(),
  tmdbId: z.number(),
  title: z.string(),
  year: z.number().optional(),
  monitored: z.boolean(),
  hasFile: z.boolean(),
  isAvailable: z.boolean().optional(),
  sizeOnDisk: z.number().optional(),
});

// Sonarr series object from GET /api/v3/series
export const SonarrSeriesSchema = z.object({
  id: z.number(),
  tvdbId: z.number(),
  title: z.string(),
  year: z.number().optional(),
  monitored: z.boolean(),
  seasonFolder: z.boolean().optional(),
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
});

// Queue item from GET /api/v3/queue
export const ArrQueueItemSchema = z.object({
  id: z.number(),
  movieId: z.number().optional(), // Radarr only
  seriesId: z.number().optional(), // Sonarr only
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

export const ArrQueueResponseSchema = z.object({
  page: z.number().optional(),
  pageSize: z.number().optional(),
  sortKey: z.string().optional(),
  sortDirection: z.string().optional(),
  totalRecords: z.number().optional(),
  records: z.array(ArrQueueItemSchema),
});

export type RadarrMovie = z.infer<typeof RadarrMovieSchema>;
export type SonarrSeries = z.infer<typeof SonarrSeriesSchema>;
export type ArrQueueItem = z.infer<typeof ArrQueueItemSchema>;
export type ArrQueueResponse = z.infer<typeof ArrQueueResponseSchema>;
