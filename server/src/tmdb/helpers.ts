import {
  type RegionGroupId,
  regionGroups,
  type GenreKey,
  unifiedGenres,
  regionGroupKeys,
  type DiscoverQuery,
  type UserSettingsQuery,
  type MediaType,
} from '@findarr/shared';
import type { FastifyBaseLogger } from 'fastify';

import { HttpError } from '../utils/errors.js';
import { sleep } from '../utils/helper.js';
import type { TMDBDiscoverParams } from './schemas.js';

/**
 * Build region filters from selected region groups
 */
export const buildRegionFilters = (regions: RegionGroupId[]) => {
  // Show all if no regions selected
  if (regions.length === 0 || regions.length === regionGroupKeys.length) {
    return { languageFilter: '', countryFilter: '' };
  }

  const includedLanguages = regions.flatMap((groupId) => regionGroups[groupId].languages);
  const includedCountries = regions.flatMap((groupId) => regionGroups[groupId].countries);

  return {
    languageFilter: includedLanguages.join('|'),
    countryFilter: includedCountries.join('|'),
  };
};

/**
 * Build genre filter string for TMDB API from selected genre keys
 */
export const buildGenreFilter = (genres: GenreKey[] | undefined) =>
  genres?.length ? genres.flatMap((g) => unifiedGenres[g]?.ids ?? []).join('|') : '';

/**
 * Calculate date range from days back
 */
export const getDateRangeFromDays = (days: number) => {
  const today = new Date();
  const futureDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const pastDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);

  return { pastDate, futureDate };
};

/**
 * Build date parameters for discover queries
 */
export const buildDateParams = (recentDays: number | undefined, type: MediaType | 'both') => {
  if (!recentDays) return {};

  const { pastDate, futureDate } = getDateRangeFromDays(recentDays);

  const formatDate = (date: Date) => date.toISOString().split('T')[0] || '';

  const dateParams: Record<string, string> = {};

  if (type === 'movie' || type === 'both') {
    dateParams['primary_release_date.gte'] = formatDate(pastDate);
    dateParams['primary_release_date.lte'] = formatDate(futureDate);
  }

  if (type === 'tv' || type === 'both') {
    dateParams['air_date.gte'] = formatDate(pastDate);
    dateParams['air_date.lte'] = formatDate(futureDate);
  }

  return dateParams;
};

export const buildDiscoverParams = (
  params: DiscoverQuery & UserSettingsQuery,
): TMDBDiscoverParams => {
  const {
    type = 'both',
    language = 'en-US',
    recentDays,
    page = 1,
    genres = [],
    regions = [],
  } = params;

  const region = language.split('-')[1] || 'US';
  const { languageFilter, countryFilter } = buildRegionFilters(regions);
  const genreFilter = buildGenreFilter(genres);
  const dateParams = buildDateParams(recentDays, type);

  return {
    page,
    region,
    language,
    watch_region: region,
    ...dateParams,
    ...(languageFilter && { with_original_language: languageFilter }),
    ...(countryFilter && { with_origin_country: countryFilter }),
    ...(genreFilter && { with_genres: genreFilter }),
  };
};

/**
 * Helper utilities for rate-limited API processing
 */

function backoffDelay(attempt: number, baseDelay: number): number {
  // Exponential backoff + jitter
  const jitter = Math.random() * 300;
  return baseDelay * Math.pow(2, attempt) + jitter;
}

/**
 * Process items with worker pool pattern and rate limiting
 * Handles TMDB API rate limits with automatic retry and exponential backoff
 *
 * @example
 * ```typescript
 * const results = await processWithWorkerPool({
 *   items: tvShows,
 *   processFn: async (show) => {
 *     return await fastify.tmdb.findByExternalId({ tvdbId: show.tvdbId, type: 'tv' });
 *   },
 *   log: fastify.log,
 * });
 * ```
 */
export async function processWithWorkerPool<TItem, TResult>(options: {
  /** Items to process */
  items: TItem[];
  /** Function to process each item (should return null on failure) */
  processFn: (item: TItem) => Promise<TResult | null>;
  /** Logger instance */
  log: FastifyBaseLogger;
}): Promise<{ successCount: number; results: TResult[] }> {
  const { items, processFn, log } = options;

  // TMDB API rate limiting constants
  const CONCURRENCY = 8;
  const MAX_RETRIES = 2;
  const BASE_DELAY = 500;

  let queueIndex = 0;
  const results: TResult[] = [];

  async function processWithRetry(item: TItem, attempt = 0): Promise<TResult | null> {
    try {
      return await processFn(item);
    } catch (error: unknown) {
      // Retry on rate limit errors
      if (error instanceof HttpError && error.statusCode === 429 && attempt < MAX_RETRIES) {
        const delay = backoffDelay(attempt, BASE_DELAY);
        await sleep(delay);
        return processWithRetry(item, attempt + 1);
      }

      // Rethrow other errors
      throw error;
    }
  }

  const worker = async (): Promise<number> => {
    let localCount = 0;

    while (true) {
      const index = queueIndex++;
      if (index >= items.length) break;

      const item = items[index];
      if (!item) continue;

      try {
        const result = await processWithRetry(item);

        if (result !== null) {
          results.push(result);
          localCount++;
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        log.warn({ name: 'tmdb', error: message }, 'Worker processing failed');
      }

      // Progress logging
      if ((index + 1) % 50 === 0 || index + 1 === items.length) {
        log.info(
          {
            name: 'tmdb',
            processedItems: index + 1,
            totalItems: items.length,
            successCount: results.length,
          },
          'Worker progress',
        );
      }
    }

    return localCount;
  };

  // Start worker pool
  const workerResults = await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  const successCount = workerResults.reduce((sum, count) => sum + count, 0);

  return { successCount, results };
}
