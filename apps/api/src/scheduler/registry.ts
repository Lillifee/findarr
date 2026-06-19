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
import { createLibrarySyncScheduler, createLibraryQueueSyncScheduler } from '../lib/schedulers.js';
import type { Scheduler } from './types.js';

export function createSchedulers(fastify: FastifyInstance) {
  return {
    jellyfinLibrarySync: createLibrarySyncScheduler(fastify.jellyfin),
    jellyfinQueueSync: createLibraryQueueSyncScheduler(fastify.jellyfin),
    plexLibrarySync: createLibrarySyncScheduler(fastify.plex),
    plexQueueSync: createLibraryQueueSyncScheduler(fastify.plex),
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
