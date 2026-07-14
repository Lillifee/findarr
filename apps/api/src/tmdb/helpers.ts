import {
  regionGroups,
  unifiedGenres,
  regionGroupKeys,
  type RegionGroupId,
  type GenreKey,
} from '@findarr/shared/constants';
import type { MediaType } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';

import { HttpError } from '../utils/errors.js';
import { sleep } from '../utils/helper.js';
import type { AppLogger } from '../utils/logger.js';

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
  isDefined(genres) ? genres.flatMap((g) => unifiedGenres[g]?.ids ?? []).join('|') : '';

/**
 * Calculate date range from days back
 */
export const getDateRangeFromDays = (days: number) => {
  const today = new Date();
  const futureDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const pastDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);

  return { pastDate, futureDate };
};

const formatDate = (date: Date) => date.toISOString().split('T')[0] ?? '';

/**
 * Build date parameters for discover queries
 */
export const buildDateParams = (type: MediaType, recentDays: number) => {
  const { pastDate, futureDate } = getDateRangeFromDays(recentDays);

  const dateParams: Record<string, string> = {};

  if (type === 'movie') {
    dateParams['primary_release_date.gte'] = formatDate(pastDate);
    dateParams['primary_release_date.lte'] = formatDate(futureDate);
  }

  if (type === 'tv') {
    dateParams['air_date.gte'] = formatDate(pastDate);
    dateParams['air_date.lte'] = formatDate(futureDate);
  }

  return dateParams;
};

/**
 * Helper utilities for rate-limited API processing
 */

function backoffDelay(attempt: number, baseDelay: number): number {
  // Exponential backoff + jitter
  const jitter = Math.random() * 300;
  return baseDelay * 2 ** attempt + jitter;
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
 *   appLog: fastify.appLog,
 * });
 * ```
 */
export async function processWithWorkerPool<TItem, TResult>(options: {
  /** Items to process */
  items: TItem[];
  /** Function to process each item (should return null on failure) */
  processFn: (item: TItem) => Promise<TResult | null>;
  /** Logger instance */
  appLog: AppLogger;
}): Promise<{ successCount: number; results: TResult[] }> {
  const { items, processFn, appLog } = options;

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
      const index = (queueIndex += 1);
      if (index >= items.length) {
        break;
      }

      const item = items[index];
      if (!isDefined(item)) {
        continue;
      }

      try {
        // Sequential by design: each worker drains the shared queue one item at
        // a time which keeps us within the TMDB rate limit. (see Promise.all below)
        // oxlint-disable-next-line eslint/no-await-in-loop
        const result = await processWithRetry(item);

        if (isDefined(result)) {
          results.push(result);
          localCount += 1;
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        appLog.warn({ error: message }, 'Worker processing failed');
      }

      // Progress logging
      if ((index + 1) % 50 === 0 || index + 1 === items.length) {
        appLog.info(
          {
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
  const workerResults = await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => worker()),
  );

  const successCount = workerResults.reduce((sum, count) => sum + count, 0);

  return { successCount, results };
}
