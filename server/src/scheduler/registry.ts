import type { FastifyInstance } from 'fastify';
import {
  createArrLibrarySyncScheduler,
  createArrQueueMonitorScheduler,
  createArrQueueFastSyncScheduler,
} from '../arr/schedulers.js';
import {
  createCatalogCacheSyncScheduler,
  createCatalogKeywordEnrichmentScheduler,
} from '../catalog/schedulers.js';
import {
  createJellyfinLibrarySyncScheduler,
  createJellyfinQueueSyncScheduler,
} from '../jellyfin/schedulers.js';
import type { Scheduler } from './types.js';

/**
 * Create scheduler registry with service instances from fastify
 * This factory function allows passing actual service instances instead of service type strings
 */
export function createSchedulers(fastify: FastifyInstance) {
  return {
    jellyfinLibrarySync: createJellyfinLibrarySyncScheduler(),
    jellyfinQueueSync: createJellyfinQueueSyncScheduler(),
    radarrLibrarySync: createArrLibrarySyncScheduler(fastify.radarr),
    radarrQueueMonitor: createArrQueueMonitorScheduler(fastify.radarr),
    radarrQueueFastSync: createArrQueueFastSyncScheduler(fastify.radarr),
    sonarrLibrarySync: createArrLibrarySyncScheduler(fastify.sonarr),
    sonarrQueueMonitor: createArrQueueMonitorScheduler(fastify.sonarr),
    sonarrQueueFastSync: createArrQueueFastSyncScheduler(fastify.sonarr),
    catalogCacheSync: createCatalogCacheSyncScheduler(),
    catalogKeywordEnrichment: createCatalogKeywordEnrichmentScheduler(),
  } as const satisfies Record<string, Scheduler>;
}
