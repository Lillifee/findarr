import type { DbMedia } from '@findarr/shared/db';
import type { Media } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';

import type { Database } from '../db/service.js';
import { getInteractionsBatch, getUserRatingCounts } from '../interaction/repository.js';
import { getUserPreferences } from '../preferences/repository.js';
import type { TMDBService } from '../tmdb/service.js';
import type { UserService } from '../user/service.js';
import type { AppLogger } from '../utils/logger.js';
import { getMediaRecordsBatch, getMediaStats } from './repository.js';
import { scoreMediaItems, scoreMediaItemsForUser } from './scoring.js';

function createFallbackMediaRecord(dbMedia: DbMedia): Media {
  return {
    tmdbId: dbMedia.tmdbId ?? -1,
    type: dbMedia.type,
    name: 'Unknown media',
    date: undefined,
    posterPath: undefined,
    backdropPath: undefined,
    overview: undefined,
    voteAverage: 0,
    voteCount: 0,
    popularity: 0,
    originalLanguage: '',
    originCountry: undefined,
    genres: [],
    state: { record: dbMedia },
  };
}

// ============================================================================
// Media Enrichment Service - Add database state to TMDB media items
// Split into separate concerns: media records, user interactions, and scoring
// ============================================================================

export interface MediaContext {
  db: Database;
  tmdb: TMDBService;
  user: UserService;
  appLog: AppLogger;
}

/**
 * Media enrichment service
 */
export function createMediaService(context: MediaContext) {
  const { db, tmdb, appLog } = context;
  const log = appLog.scope('media');

  /**
   * Enrich TMDB media items with database records (status, jellyfinId, arrId, season tracking)
   * Frontend can match season status by seasonNumber from state.record.seasons if needed
   */
  async function enrichWithRecords<T extends Media>(mediaItems: T[]): Promise<T[]> {
    if (mediaItems.length === 0) {
      return mediaItems;
    }

    const mediaRecords = await getMediaRecordsBatch(db, mediaItems);

    return mediaItems.map((item) => {
      const record = mediaRecords.get(`${item.tmdbId}_${item.type}`);
      return record ? { ...item, state: { ...item.state, record } } : item;
    });
  }

  /**
   * Enrich media items with user interactions
   */
  async function enrichWithInteractions<T extends Media>(
    mediaItems: T[],
    userId: number,
  ): Promise<T[]> {
    const interactionsMap = await getInteractionsBatch(db, mediaItems);

    return mediaItems.map((item) => {
      const mediaId = item.state?.record?.id;
      if (!isDefined(mediaId)) {
        return item;
      }

      const mediaInteractions = interactionsMap.get(mediaId);

      const interaction = mediaInteractions?.find((i) => i.user?.id === userId);
      const voters = mediaInteractions;

      return {
        ...item,
        state: {
          ...item.state,
          ...(interaction && { interaction }),
          ...(voters && { voters }),
        },
      };
    });
  }

  /**
   * Enrich media items with scoring
   */
  async function enrichWithScoring<T extends Media>(
    mediaItems: T[],
    userId?: number,
  ): Promise<T[]> {
    if (mediaItems.length === 0) {
      return mediaItems;
    }

    // Get precomputed catalog stats from database
    const statsMap = await getMediaStats(db);
    const movieStats = statsMap.get('movie');
    const tvStats = statsMap.get('tv');

    // If stats not available (first run before sync), return items unscored
    if (!movieStats || !tvStats) {
      return mediaItems;
    }

    // Apply base scoring (trending, popularity, recency, rating)
    let scoredItems: T[] = scoreMediaItems(mediaItems, movieStats, tvStats);

    // Apply user preference scoring if authenticated
    if (isDefined(userId)) {
      const [preferences, ratingCounts] = await Promise.all([
        getUserPreferences(db, userId),
        getUserRatingCounts(db, userId),
      ]);

      if (preferences.size > 0) {
        scoredItems = scoreMediaItemsForUser(scoredItems, preferences, ratingCounts);
      }
    }

    return scoredItems;
  }

  /**
   * Fetch TMDB details for database records
   */
  async function fetchTMDBDetails(mediaDbRows: DbMedia[]): Promise<Media[]> {
    const results = await Promise.all(
      mediaDbRows.map(async (record) => {
        if (!isDefined(record.tmdbId)) {
          log.warn({ mediaId: record.id, type: record.type }, 'Media record is missing a TMDB ID');
          return createFallbackMediaRecord(record);
        }

        const details = await tmdb
          .details({ id: record.tmdbId, type: record.type })
          .catch((error: unknown) => {
            log.warn(
              { err: error, tmdbId: record.tmdbId, type: record.type },
              'Failed to fetch TMDB details',
            );
            return createFallbackMediaRecord(record);
          });

        // Attach database record to TMDB data
        return { ...details, state: { record } };
      }),
    );

    return results.filter((x) => isDefined(x));
  }

  /**
   * Helper: Enrich TMDB items with complete state
   * Adds scoring, media records, and optionally user interactions
   */
  async function enrichMediaResults<T extends Media>(
    items: T[],
    userId: number,
    options: { scoring?: boolean; records?: boolean; interactions?: boolean } = {},
  ): Promise<T[]> {
    let enriched = items;
    const { scoring = true, records = true, interactions = true } = options;

    // Add scores
    if (scoring) {
      enriched = await enrichWithScoring(enriched, userId);
    }

    // Add database records (status, arrId, jellyfinId)
    if (records) {
      enriched = await enrichWithRecords(enriched);
    }

    // Add user interactions and vote counts
    if (interactions) {
      enriched = await enrichWithInteractions(enriched, userId);
    }

    return enriched;
  }

  return {
    enrichMediaResults,
    enrichWithRecords,
    enrichWithInteractions,
    enrichWithScoring,
    fetchTMDBDetails,
  };
}

export type MediaService = ReturnType<typeof createMediaService>;
