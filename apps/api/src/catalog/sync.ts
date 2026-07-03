import type { Media } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';

import { seedMediaStats, upsertMediaStats } from '../media/repository.js';
import type { SchedulerContext } from '../scheduler/types.js';
import { processWithWorkerPool } from '../tmdb/helpers.js';
import {
  upsertCatalogCache,
  cleanupCatalogCache,
  listCatalogItemsMissingKeywords,
  updateCatalogKeywords,
  computeCatalogMediaStats,
} from './repository.js';

/**
 * Deduplicate media items based on ID and type
 * Prefers items with trendingRank (from trending endpoint)
 */
function deduplicateMediaByTmdbKey(items: Media[]): Media[] {
  const mediaByTmdbKey = new Map<string, Media>();

  for (const item of items) {
    const key = `${item.tmdbId}_${item.type}`;
    const existingItem = mediaByTmdbKey.get(key);
    // Prefer items with trendingRank (from trending) over discover results
    if (!existingItem || isDefined(item.trendingRank)) {
      mediaByTmdbKey.set(key, item);
    }
  }

  return [...mediaByTmdbKey.values()];
}

const createPageRange = (length: number) => Array.from({ length }).map((_, i) => i + 1);

/**
 * Sync catalog cache with latest popular media from TMDB
 * Phase 1: Quick sync - stores basic media immediately (without keywords)
 * Keywords are enriched separately by enrichCatalogKeywords()
 */
export async function syncCatalogCache(context: SchedulerContext): Promise<void> {
  if (!context.tmdb.isConfigured()) {
    return;
  }

  const startTime = Date.now();
  context.appLog.info({ name: 'catalog', phase: 'cache-sync' }, 'Starting cache sync');

  const language = 'en-US';

  // Fetch both trending and recent releases (already includes basic metadata)
  context.appLog.info(
    { name: 'catalog', phase: 'cache-sync' },
    'Fetching trending and discover results from TMDB',
  );
  const [trendingResult, discoverResult] = await Promise.all([
    context.tmdb.trending({ language, time_window: 'week' }, createPageRange(5)),
    context.tmdb.discover({ type: 'both', recentDays: 500 }, createPageRange(15)),
  ]);

  // Merge and deduplicate (prefer items with trendingRank)
  const mergedMedia = [...trendingResult.results, ...discoverResult.results];
  const deduplicatedMedia = deduplicateMediaByTmdbKey(mergedMedia);

  context.appLog.info(
    { name: 'catalog', phase: 'cache-sync', totalItems: deduplicatedMedia.length },
    'Fetched unique items, storing to database',
  );

  // Store basic media immediately (keywords will be empty arrays)
  await upsertCatalogCache(context.db, deduplicatedMedia);

  // Cleanup old entries (items not in current popular list)
  const activeMediaKeys = deduplicatedMedia.map((item) => ({
    tmdbId: item.tmdbId,
    type: item.type,
  }));
  const deletedCount = await cleanupCatalogCache(context.db, activeMediaKeys);

  // Compute and update catalog stats for both types
  // Seed with defaults if first run, then update with growth strategy
  await seedMediaStats(context.db);

  context.appLog.info(
    { name: 'catalog', phase: 'cache-sync' },
    'Computing catalog stats from current cache',
  );
  const [movieStats, tvStats] = await Promise.all([
    computeCatalogMediaStats(context.db, 'movie'),
    computeCatalogMediaStats(context.db, 'tv'),
  ]);

  await Promise.all([
    upsertMediaStats(context.db, 'movie', movieStats),
    upsertMediaStats(context.db, 'tv', tvStats),
  ]);

  context.appLog.info(
    {
      name: 'catalog',
      phase: 'cache-sync',
      movieStats: {
        maxPopularity: movieStats.maxPopularity,
        maxVoteCount: movieStats.maxVoteCount,
        avgRating: movieStats.avgRating.toFixed(2),
      },
      tvStats: {
        maxPopularity: tvStats.maxPopularity,
        maxVoteCount: tvStats.maxVoteCount,
        avgRating: tvStats.avgRating.toFixed(2),
      },
    },
    'Catalog stats updated',
  );

  const durationMs = Date.now() - startTime;
  const durationSec = Math.round(durationMs / 1000);

  context.appLog.info(
    {
      name: 'catalog',
      phase: 'cache-sync',
      totalItems: deduplicatedMedia.length,
      deletedCount,
      durationSec,
      language,
    },
    'Catalog cache sync completed',
  );
}

/**
 * Enrich catalog cache with keywords from TMDB
 * Phase 2: Background enrichment - fetches detailed data for items without keywords
 * Uses worker pool pattern with rate limiting to avoid overwhelming TMDB API
 */
export async function enrichCatalogKeywords(context: SchedulerContext): Promise<void> {
  const startTime = Date.now();
  context.appLog.info(
    { name: 'catalog', phase: 'keyword-enrichment' },
    'Starting keyword enrichment',
  );

  try {
    // Get items that need keyword enrichment
    const mediaItemsMissingKeywords = await listCatalogItemsMissingKeywords(context.db);

    if (mediaItemsMissingKeywords.length === 0) {
      context.appLog.info(
        { name: 'catalog', phase: 'keyword-enrichment' },
        'No items need keyword enrichment',
      );
      return;
    }

    context.appLog.info(
      {
        name: 'catalog',
        phase: 'keyword-enrichment',
        totalItems: mediaItemsMissingKeywords.length,
      },
      'Enriching items with keywords',
    );

    const { successCount } = await processWithWorkerPool({
      items: mediaItemsMissingKeywords,
      processFn: async (item) => {
        const details = await context.tmdb.details({ id: item.tmdbId, type: item.type });
        await updateCatalogKeywords(context.db, item.tmdbId, item.type, details.keywords ?? []);
        return item.tmdbId;
      },
      appLog: context.appLog,
    });

    const failCount = mediaItemsMissingKeywords.length - successCount;
    const durationMs = Date.now() - startTime;
    const durationSec = Math.round(durationMs / 1000);

    context.appLog.info(
      {
        name: 'catalog',
        phase: 'keyword-enrichment',
        successCount,
        failCount,
        totalItems: mediaItemsMissingKeywords.length,
        durationSec,
      },
      'Keyword enrichment completed',
    );
  } catch (error) {
    context.appLog.error(
      { name: 'catalog', phase: 'keyword-enrichment', err: error },
      'Keyword enrichment failed',
    );
    throw error;
  }
}
