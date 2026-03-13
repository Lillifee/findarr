import type { Media } from '@findarr/shared';
import type { FastifyInstance } from 'fastify';
import {
  upsertCatalogCache,
  cleanupCatalogCache,
  getCatalogItemsWithoutKeywords,
  updateCatalogKeywords,
} from './repository.js';

/**
 * Sync catalog cache with latest popular media from TMDB
 * Phase 1: Quick sync - stores basic media immediately (without keywords)
 * Keywords are enriched separately by enrichCatalogKeywords()
 */
export async function syncCatalogCache(fastify: FastifyInstance): Promise<void> {
  const startTime = Date.now();
  fastify.log.info('Starting catalog cache sync (phase 1: basic media)...');

  try {
    // TODO - use language setting from config
    const language = 'de-DE';

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
  } catch (error) {
    fastify.log.error({ error }, 'Catalog cache sync failed');
    throw error;
  }
}

/**
 * Enrich catalog cache with keywords from TMDB
 * Phase 2: Background enrichment - fetches detailed data for items without keywords
 * Uses rate limiting to avoid overwhelming TMDB API
 */
export async function enrichCatalogKeywords(fastify: FastifyInstance): Promise<void> {
  const startTime = Date.now();
  fastify.log.info('Starting keyword enrichment (phase 2)...');

  try {
    // TODO - use language setting from config
    const language = 'de-DE';

    // Get items that need keyword enrichment
    const itemsWithoutKeywords = await getCatalogItemsWithoutKeywords(fastify.db);

    if (itemsWithoutKeywords.length === 0) {
      fastify.log.info('No items need keyword enrichment');
      return;
    }

    fastify.log.info(`Enriching ${itemsWithoutKeywords.length} items with keywords...`);

    let successCount = 0;
    let failCount = 0;

    // Fetch details with keywords for each item
    for (let i = 0; i < itemsWithoutKeywords.length; i++) {
      const item = itemsWithoutKeywords[i];
      if (!item) continue;

      try {
        // Add delay between requests to avoid rate limiting (10 req/s = 100ms delay)
        // This also yields to the event loop, preventing server blocking
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const details = await fastify.tmdb.getDetails({
          id: item.tmdbId,
          type: item.type,
          language,
        });

        // Update only the keywords field
        await updateCatalogKeywords(fastify.db, item.tmdbId, item.type, details.keywords ?? []);
        successCount++;

        if ((i + 1) % 20 === 0) {
          fastify.log.info(`Progress: ${i + 1}/${itemsWithoutKeywords.length} items enriched`);
        }
      } catch (error) {
        failCount++;
        fastify.log.error(
          { error, tmdbId: item.tmdbId, type: item.type },
          'Failed to enrich keywords for item'
        );
      }
    }

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

/**
 * Start background catalog cache sync scheduler
 * Runs two-phase sync: (1) quick sync of basic media, (2) background keyword enrichment
 * Returns timer handle for cleanup
 */
export function startCatalogCacheScheduler(fastify: FastifyInstance, intervalHours: number = 6) {
  const intervalMs = intervalHours * 60 * 60 * 1000;

  fastify.log.info(`Starting catalog cache sync scheduler (every ${intervalHours} hours)`);

  const run = async (): Promise<void> => {
    // Phase 1: Quick sync (basic media)
    await syncCatalogCache(fastify).catch(error => {
      fastify.log.error({ error }, 'Catalog cache sync (phase 1) failed');
    });

    // Phase 2: Keyword enrichment (runs after phase 1)
    await enrichCatalogKeywords(fastify).catch(error => {
      fastify.log.error({ error }, 'Keyword enrichment (phase 2) failed');
    });

    // Schedule next run
    timer = setTimeout(run, intervalMs);
    timer.unref();
  };

  let timer = setTimeout(run, intervalMs);
  timer.unref();

  return timer;
}
