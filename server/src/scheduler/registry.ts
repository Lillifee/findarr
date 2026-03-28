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

/**
 * Union type of all valid scheduler names
 */
export type SchedulerName =
  | 'jellyfinLibrarySync'
  | 'jellyfinQueueSync'
  | 'radarrLibrarySync'
  | 'radarrQueueMonitor'
  | 'radarrQueueFastSync'
  | 'sonarrLibrarySync'
  | 'sonarrQueueMonitor'
  | 'sonarrQueueFastSync'
  | 'catalogCacheSync'
  | 'catalogKeywordEnrichment';

const VALID_SCHEDULER_NAMES: readonly SchedulerName[] = [
  'jellyfinLibrarySync',
  'jellyfinQueueSync',
  'radarrLibrarySync',
  'radarrQueueMonitor',
  'radarrQueueFastSync',
  'sonarrLibrarySync',
  'sonarrQueueMonitor',
  'sonarrQueueFastSync',
  'catalogCacheSync',
  'catalogKeywordEnrichment',
] as const;

/**
 * Type guard to check if a string is a valid scheduler name
 * Useful for validating API inputs
 */
export function isValidSchedulerName(name: string): name is SchedulerName {
  return VALID_SCHEDULER_NAMES.includes(name as SchedulerName);
}
