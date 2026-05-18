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
  if (!fastify.tmdb.isConfigured()) return;

  const startTime = Date.now();
  fastify.log.info({ name: 'catalog', phase: 'cache-sync' }, 'Starting cache sync');

  // TODO - use language setting from config
  const language = 'en-US';

  const arrayOfNumbers = (length: number) => Array.from({ length }).map((_, i) => i + 1);

  // Fetch both trending and recent releases (already includes basic metadata)
  fastify.log.info(
    { name: 'catalog', phase: 'cache-sync' },
    'Fetching trending and discover results from TMDB'
  );
  const [trendingResult, discoverResult] = await Promise.all([
    fastify.tmdb.fetchTrending({ language, time_window: 'week' }, arrayOfNumbers(5)),
    fastify.tmdb.fetchDiscover({ type: 'both', recentDays: 500 }, arrayOfNumbers(15)),
  ]);

  // Merge and deduplicate (prefer items with trendingRank)
  const merged = [...trendingResult.results, ...discoverResult.results];
  const deduped = deduplicateMedia(merged);

  fastify.log.info(
    { name: 'catalog', phase: 'cache-sync', totalItems: deduped.length },
    'Fetched unique items, storing to database'
  );

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

  fastify.log.info(
    { name: 'catalog', phase: 'cache-sync' },
    'Computing catalog stats from current cache'
  );
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
    'Catalog stats updated'
  );

  const durationMs = Date.now() - startTime;
  const durationSec = Math.round(durationMs / 1000);

  fastify.log.info(
    {
      name: 'catalog',
      phase: 'cache-sync',
      totalItems: deduped.length,
      deletedCount,
      durationSec,
      language,
    },
    'Catalog cache sync completed'
  );
}

/**
 * Enrich catalog cache with keywords from TMDB
 * Phase 2: Background enrichment - fetches detailed data for items without keywords
 * Uses worker pool pattern with rate limiting to avoid overwhelming TMDB API
 */
export async function enrichCatalogKeywords(fastify: FastifyInstance): Promise<void> {
  const startTime = Date.now();
  fastify.log.info({ name: 'catalog', phase: 'keyword-enrichment' }, 'Starting keyword enrichment');

  try {
    // Get items that need keyword enrichment
    const itemsWithoutKeywords = await getCatalogItemsWithoutKeywords(fastify.db);

    if (itemsWithoutKeywords.length === 0) {
      fastify.log.info(
        { name: 'catalog', phase: 'keyword-enrichment' },
        'No items need keyword enrichment'
      );
      return;
    }

    fastify.log.info(
      {
        name: 'catalog',
        phase: 'keyword-enrichment',
        totalItems: itemsWithoutKeywords.length,
      },
      'Enriching items with keywords'
    );

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
        name: 'catalog',
        phase: 'keyword-enrichment',
        successCount,
        failCount,
        totalItems: itemsWithoutKeywords.length,
        durationSec,
      },
      'Keyword enrichment completed'
    );
  } catch (error) {
    fastify.log.error(
      { name: 'catalog', phase: 'keyword-enrichment', err: error },
      'Keyword enrichment failed'
    );
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
