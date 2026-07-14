import type { DbMedia } from '@findarr/shared/db';
import type { Media } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';

import type { Database } from '../db/service.js';
import { getInteractionsBatch } from '../interaction/repository.js';
import { getUserGenrePreferences, getUserKeywordPreferences } from '../preferences/repository.js';
import type { TMDBService } from '../tmdb/service.js';
import type { UserService } from '../user/service.js';
import { getMediaRecordsBatch, getMediaStats } from './repository.js';
import { scoreMediaItems, scoreMediaItemsForUser } from './scoring.js';

// ============================================================================
// Media Enrichment Service - Add database state to TMDB media items
// Split into separate concerns: media records, user interactions, and scoring
// ============================================================================

export interface MediaContext {
  db: Database;
  tmdb: TMDBService;
  user: UserService;
}

/**
 * Media enrichment service
 */
export function createMediaService(context: MediaContext) {
  const { db, tmdb } = context;

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
      const [genrePreferences, keywordPreferences] = await Promise.all([
        getUserGenrePreferences(db, userId),
        getUserKeywordPreferences(db, userId),
      ]);

      if (genrePreferences.size > 0 || keywordPreferences.size > 0) {
        scoredItems = scoreMediaItemsForUser(scoredItems, genrePreferences, keywordPreferences);
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
          return null;
        }

        const details = await tmdb
          .details({ id: record.tmdbId, type: record.type })
          .catch(() => null);

        // Attach database record to TMDB data
        return details && { ...details, state: { record } };
      }),
    );

    return results.filter((x) => isDefined(x));
  }

  return { enrichWithRecords, enrichWithInteractions, enrichWithScoring, fetchTMDBDetails };
}

export type MediaService = ReturnType<typeof createMediaService>;
