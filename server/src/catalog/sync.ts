import type { Media } from '@findarr/shared';
import type { FastifyInstance } from 'fastify';
import { seedMediaStats, upsertMediaStats } from '../media/repository.js';
import { processWithWorkerPool } from '../tmdb/helpers.js';
import {
  upsertCatalogCache,
  cleanupCatalogCache,
  getCatalogItemsWithoutKeywords,
  updateCatalogKeywords,
  computeMediaStats,
} from './repository.js';

/**
 * Sync catalog cache with latest popular media from TMDB
 * Phase 1: Quick sync - stores basic media immediately (without keywords)
 * Keywords are enriched separately by enrichCatalogKeywords()
 */
export async function syncCatalogCache(fastify: FastifyInstance): Promise<void> {
  const startTime = Date.now();
  fastify.log.info('Starting catalog cache sync (phase 1: basic media)...');

  // TODO - use language setting from config
  const language = 'en-US';

  // Fetch both trending and recent releases (already includes basic metadata)
  fastify.log.info('Fetching trending and discover results from TMDB...');
  const [trendingResult, discoverResult] = await Promise.all([
    fastify.tmdb.fetchTrending({ language, time_window: 'week' }, [1, 2, 3, 4, 5]),
    fastify.tmdb.fetchDiscover(
      { language, type: 'both', recentDays: 365 },
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    ),
  ]);

  // Merge and deduplicate (prefer items with trendingRank)
  const merged = [...trendingResult.results, ...discoverResult.results];
  const deduped = deduplicateMedia(merged);

  fastify.log.info(`Fetched ${deduped.length} unique items, storing to database...`);

  // Store basic media immediately (keywords will be empty arrays)
  await upsertCatalogCache(fastify.db, deduped);

  // Cleanup old entries (items not in current popular list)
  const currentIds = deduped.map(item => ({
    tmdbId: item.tmdbId,
    type: item.type,
  }));
  const deletedCount = await cleanupCatalogCache(fastify.db, currentIds);

  // Compute and update catalog stats for both types
  // Seed with defaults if first run, then update with growth strategy
  await seedMediaStats(fastify.db);

  fastify.log.info('Computing catalog stats from current cache...');
  const [movieStats, tvStats] = await Promise.all([
    computeMediaStats(fastify.db, 'movie'),
    computeMediaStats(fastify.db, 'tv'),
  ]);

  await Promise.all([
    upsertMediaStats(fastify.db, 'movie', movieStats),
    upsertMediaStats(fastify.db, 'tv', tvStats),
  ]);

  fastify.log.info(
    {
      movieStats: {
        popularity: `${movieStats.minPopularity}-${movieStats.maxPopularity}`,
        voteCount: `${movieStats.minVoteCount}-${movieStats.maxVoteCount}`,
        avgRating: movieStats.maxAvgRating.toFixed(2),
      },
      tvStats: {
        popularity: `${tvStats.minPopularity}-${tvStats.maxPopularity}`,
        voteCount: `${tvStats.minVoteCount}-${tvStats.maxVoteCount}`,
        avgRating: tvStats.maxAvgRating.toFixed(2),
      },
    },
    'Catalog stats updated'
  );

  const durationMs = Date.now() - startTime;
  const durationSec = Math.round(durationMs / 1000);

  fastify.log.info(
    {
      totalItems: deduped.length,
      deletedCount,
      durationSec,
      language,
    },
    'Catalog cache sync completed (phase 1)'
  );
}

/**
 * Enrich catalog cache with keywords from TMDB
 * Phase 2: Background enrichment - fetches detailed data for items without keywords
 * Uses worker pool pattern with rate limiting to avoid overwhelming TMDB API
 */
export async function enrichCatalogKeywords(fastify: FastifyInstance): Promise<void> {
  const startTime = Date.now();
  fastify.log.info('Starting keyword enrichment (phase 2)...');

  try {
    // Get items that need keyword enrichment
    const itemsWithoutKeywords = await getCatalogItemsWithoutKeywords(fastify.db);

    if (itemsWithoutKeywords.length === 0) {
      fastify.log.info('No items need keyword enrichment');
      return;
    }

    fastify.log.info(`Enriching ${itemsWithoutKeywords.length} items with keywords...`);

    const { successCount } = await processWithWorkerPool({
      items: itemsWithoutKeywords,
      processFn: async item => {
        const details = await fastify.tmdb.getDetails({ id: item.tmdbId, type: item.type });
        await updateCatalogKeywords(fastify.db, item.tmdbId, item.type, details.keywords ?? []);
        return item.tmdbId;
      },
      log: fastify.log,
    });

    const failCount = itemsWithoutKeywords.length - successCount;
    const durationMs = Date.now() - startTime;
    const durationSec = Math.round(durationMs / 1000);

    fastify.log.info(
      {
        successCount,
        failCount,
        totalItems: itemsWithoutKeywords.length,
        durationSec,
      },
      'Keyword enrichment completed (phase 2)'
    );
  } catch (error) {
    fastify.log.error({ error }, 'Keyword enrichment failed');
    throw error;
  }
}

/**
 * Deduplicate media items based on ID and type
 * Prefers items with trendingRank (from trending endpoint)
 */
function deduplicateMedia(items: Media[]): Media[] {
  const map = new Map<string, Media>();

  for (const item of items) {
    const key = `${item.tmdbId}_${item.type}`;
    const existing = map.get(key);
    // Prefer items with trendingRank (from trending) over discover results
    if (!existing || item.trendingRank) {
      map.set(key, item);
    }
  }

  return [...map.values()];
}
