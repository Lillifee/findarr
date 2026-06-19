/**
 * Library service configuration — mirrors the arrConfig pattern.
 * Settings DB keys are derived automatically: ${service}Url and ${service}ApiKey.
 */
export const libConfig = {
  jellyfin: {
    service: 'jellyfin' as const,
    syncScheduler: 'jellyfinLibrarySync' as const,
    queueSyncScheduler: 'jellyfinQueueSync' as const,
  },
  plex: {
    service: 'plex' as const,
    syncScheduler: 'plexLibrarySync' as const,
    queueSyncScheduler: 'plexQueueSync' as const,
  },
} as const;

export type LibServiceType = 'jellyfin' | 'plex';
export type LibServiceConfig = (typeof libConfig)[LibServiceType];
