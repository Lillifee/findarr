import {
  createScheduler,
  type Scheduler,
  type SchedulerContext,
} from '../scheduler/types.js';
import { enrichCatalogKeywords, syncCatalogCache } from './sync.js';

/**
 * Catalog Cache Sync Scheduler
 * Syncs basic media data (trending + recent releases) every 6 hours
 * Triggers keyword enrichment after completion
 */
export function createCatalogCacheSyncScheduler(): Scheduler {
  return createScheduler(
    {
      name: 'catalogCacheSync',
      description: 'Sync catalog cache with TMDB (trending + recent releases)',
      interval: 6 * 60 * 60 * 1000, // 6 hours
      enabled: true,
      runOnStartup: true,
    },
    async (context: SchedulerContext) => {
      // Phase 1: Quick sync (basic media)
      await syncCatalogCache(context);

      // Trigger keyword enrichment after sync
      context.scheduler.start({ name: 'catalogKeywordEnrichment' });

      return true; // Continue
    }
  );
}

/**
 * Catalog Keyword Enrichment Scheduler
 * Enriches catalog items with keywords from TMDB
 * Triggered by catalog cache sync, runs once then stops
 */
export function createCatalogKeywordEnrichmentScheduler(): Scheduler {
  return createScheduler(
    {
      name: 'catalogKeywordEnrichment',
      description: 'Enrich catalog with keywords (triggered after cache sync)',
      interval: 0, // 30 seconds (doesn't matter, triggered manually)
      enabled: false, // Triggered by catalogCacheSync
      runOnStartup: false,
    },
    async (context: SchedulerContext) => {
      // Phase 2: Keyword enrichment
      await enrichCatalogKeywords(context);

      // Self-terminate after completion (will be re-triggered by next catalog sync)
      return false; // Stop
    }
  );
}
