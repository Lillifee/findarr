import { RadarrMovieSchema, SonarrSeriesSchema } from './schemas.js';

/**
 * Single source of truth: all config + types inferred from here
 */
export const arrConfig = {
  radarr: {
    service: 'radarr' as const,
    mediaType: 'movie',
    queueFastSyncScheduler: 'radarrQueueFastSync' as const,

    // Client API fields
    mediaEndpoint: '/movie',
    mediaIdField: 'tmdbId',
    libraryItemSchema: RadarrMovieSchema,
    extraFields: {
      addOptions: { searchForMovie: true },
    },
  },

  sonarr: {
    service: 'sonarr' as const,
    mediaType: 'tv',
    queueFastSyncScheduler: 'sonarrQueueFastSync' as const,

    // Client API fields
    mediaEndpoint: '/series',
    mediaIdField: 'tvdbId',
    libraryItemSchema: SonarrSeriesSchema,
    extraFields: {
      addOptions: { searchForMissingEpisodes: true },
      seasons: [],
    },
  },
} as const;

/**
 * Service type literal (auto-derived)
 */
export type ArrServiceType = 'radarr' | 'sonarr';

/**
 * Union of all config object types
 */
export type ArrServiceConfig = (typeof arrConfig)[ArrServiceType];
