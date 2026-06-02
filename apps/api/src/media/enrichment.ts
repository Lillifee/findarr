import { type DbMedia, type Media, isDefined } from '@findarr/shared';

import type { Database } from '../db/service.js';
import { getInteractionsBatch, getVoteCountsBatch } from '../interaction/repository.js';
import { getUserGenrePreferences, getUserKeywordPreferences } from '../preferences/repository.js';
import type { TMDBService } from '../tmdb/service.js';
import { getMediaRecordsBatch, getMediaStats } from './repository.js';
import { scoreMediaItems, scoreMediaItemsForUser } from './scoring.js';

// ============================================================================
// Enrichment Utilities - Add database state to TMDB media items
// Split into separate concerns: media records and user interactions
// ============================================================================

/**
 * Enrich TMDB media items with database records (status, jellyfinId, arrId, season tracking)
 * Frontend can match season status by seasonNumber from state.record.seasons if needed
 */
export async function enrichWithRecords(db: Database, mediaItems: Media[]): Promise<Media[]> {
  if (mediaItems.length === 0) return mediaItems;

  const mediaRecords = await getMediaRecordsBatch(db, mediaItems);

  return mediaItems.map((item) => {
    const record = mediaRecords.get(`${item.tmdbId}_${item.type}`);
    return record ? { ...item, state: { ...item.state, record } } : item;
  });
}

/**
 * Enrich media items with user interactions and vote counts
 * Requires items to already have state.record with database IDs
 * Uses separate optimized batch queries for interactions and vote counts
 */
export async function enrichWithInteractions(
  db: Database,
  mediaItems: Media[],
  userId: number,
): Promise<Media[]> {
  // Fetch interactions (user-specific or all with user info)
  const interactionsMap = await getInteractionsBatch(db, mediaItems, userId);

  // Fetch vote counts (always aggregated across all users)
  const votesMap = await getVoteCountsBatch(db, mediaItems);

  return mediaItems.map((item) => {
    const mediaId = item.state?.record?.id;
    if (!isDefined(mediaId)) return item;

    const interactions = interactionsMap.get(mediaId);
    const votes = votesMap.get(mediaId);

    return {
      ...item,
      state: {
        ...item.state,
        ...(interactions && { interactions }),
        ...(votes && { votes }),
      },
    };
  });
}

/**
 * Enrich media items with scoring
 * Uses precomputed catalog stats from database and applies user preferences if authenticated
 * Returns items with scores attached (does not sort)
 */
export async function enrichWithScoring(
  db: Database,
  mediaItems: Media[],
  userId?: number,
): Promise<Media[]> {
  if (mediaItems.length === 0) return mediaItems;

  // Get precomputed catalog stats from database
  const statsMap = await getMediaStats(db);
  const movieStats = statsMap.get('movie');
  const tvStats = statsMap.get('tv');

  // If stats not available (first run before sync), return items unscored
  if (!movieStats || !tvStats) {
    return mediaItems;
  }

  // Apply base scoring (trending, popularity, recency, rating)
  let scoredItems: Media[] = scoreMediaItems(mediaItems, movieStats, tvStats);

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
 * Returns Media items with TMDB data and database record attached
 */
export async function fetchTMDBDetails(
  tmdbService: TMDBService,
  mediaDbRows: DbMedia[],
): Promise<Media[]> {
  const results = await Promise.all(
    mediaDbRows.map(async (record) => {
      if (!isDefined(record.tmdbId)) return null;

      const details = await tmdbService
        .details({ id: record.tmdbId, type: record.type })
        .catch(() => null);

      // Attach database record to TMDB data
      return details && { ...details, state: { record } };
    }),
  );

  return results.filter((x) => isDefined(x));
}
