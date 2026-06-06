import { vi, type Mocked } from 'vite-plus/test';

import { arrConfig, type ArrServiceConfig } from '../../arr/config.js';
import type { ArrService } from '../../arr/service.js';
import type { CatalogService } from '../../catalog/service.js';
import type { Database } from '../../db/service.js';
import type { JellyfinService } from '../../jellyfin/service.js';
import type { SchedulerService } from '../../scheduler/service.js';
import type { LoggerService, SchedulerContext } from '../../scheduler/types.js';
import type { TMDBService } from '../../tmdb/service.js';
import { createTestMovieDetail, createTestTVDetail } from './testHelper.js';

// Mock factories for the application services. Each returns a fully mocked
// service with sensible defaults; pass `overrides` to replace individual
// methods for a specific test.

export function createMockTMDBService(
  overrides: Partial<Mocked<TMDBService>> = {},
): Mocked<TMDBService> {
  return {
    isConfigured: vi.fn<TMDBService['isConfigured']>().mockReturnValue(true),
    testConnection: vi.fn<TMDBService['testConnection']>().mockResolvedValue(true),
    testAndSync: vi.fn<TMDBService['testAndSync']>().mockResolvedValue(true),
    getSettings: vi.fn<TMDBService['getSettings']>().mockReturnValue({ tmdbAccessTokenSet: true }),
    setSettings: vi
      .fn<TMDBService['setSettings']>()
      .mockResolvedValue({ tmdbAccessTokenSet: true }),
    search: vi.fn<TMDBService['search']>(),
    discover: vi.fn<TMDBService['discover']>(),
    trending: vi.fn<TMDBService['trending']>(),
    genres: vi.fn<TMDBService['genres']>(),
    details: vi.fn<TMDBService['details']>(),
    findByExternalId: vi.fn<TMDBService['findByExternalId']>(),
    ...overrides,
  };
}

export function createMockArrService<T extends ArrServiceConfig>(
  config: T,
  overrides: Partial<Mocked<ArrService<T>>> = {},
): Mocked<ArrService<T>> {
  const settings = {
    url: `http://${config.service}`,
    apiKeySet: true,
    qualityProfileId: 1,
    rootFolderPath: config.service === 'radarr' ? '/movies' : '/tv',
  };

  const service = {
    config,
    getSettings: vi.fn<ArrService<T>['getSettings']>().mockResolvedValue(settings),
    setSettings: vi.fn<ArrService<T>['setSettings']>().mockResolvedValue(settings),
    requestMedia: vi.fn<ArrService<T>['requestMedia']>(),
    isConfigured: vi.fn<ArrService<T>['isConfigured']>().mockReturnValue(true),
    testConnection: vi.fn<ArrService<T>['testConnection']>().mockResolvedValue(false),
    testAndSync: vi.fn<ArrService<T>['testAndSync']>().mockResolvedValue(true),
    listQualityProfiles: vi.fn<ArrService<T>['listQualityProfiles']>().mockResolvedValue([]),
    listRootFolders: vi.fn<ArrService<T>['listRootFolders']>().mockResolvedValue([]),
    listLibraryItems: vi.fn<ArrService<T>['listLibraryItems']>().mockResolvedValue([]),
    getQueue: vi.fn<ArrService<T>['getQueue']>().mockResolvedValue([]),
    resolveMediaUrl: vi.fn<ArrService<T>['resolveMediaUrl']>().mockResolvedValue(null),
    ...overrides,
  };

  // The generic `config: T` cannot be statically verified against the mapped
  // `Mocked<ArrService<T>>` type, so assert the fully-populated shape here.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return service as Mocked<ArrService<T>>;
}

export const createMockRadarrService = (
  overrides: Partial<Mocked<ArrService<typeof arrConfig.radarr>>> = {},
) => createMockArrService(arrConfig.radarr, overrides);

export const createMockSonarrService = (
  overrides: Partial<Mocked<ArrService<typeof arrConfig.sonarr>>> = {},
) => createMockArrService(arrConfig.sonarr, overrides);

const createDefaultMediaRecord = () => ({
  id: 1,
  status: 'pending' as const,
  jellyfinId: null,
  jellyfinAddedAt: null,
  tvdbId: null,
  arrId: null,
  arrUrl: null,
  seasons: null,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export function createMockCatalogService(
  overrides: Partial<Mocked<CatalogService>> = {},
): Mocked<CatalogService> {
  return {
    searchMedia: vi
      .fn<CatalogService['searchMedia']>()
      .mockResolvedValue({ results: [], page: 1, totalPages: 0 }),
    discoverMedia: vi
      .fn<CatalogService['discoverMedia']>()
      .mockResolvedValue({ results: [], page: 1, totalPages: 0 }),
    getPopularMedia: vi.fn<CatalogService['getPopularMedia']>().mockResolvedValue({
      results: [],
      page: 1,
      totalPages: 0,
      feedId: '00000000-0000-0000-0000-000000000000',
    }),
    getMediaDetails: vi.fn<CatalogService['getMediaDetails']>().mockImplementation(async (params) =>
      params.type === 'movie'
        ? createTestMovieDetail({
            tmdbId: params.id,
            state: { record: createDefaultMediaRecord() },
          })
        : createTestTVDetail({
            tmdbId: params.id,
            state: { record: createDefaultMediaRecord() },
          }),
    ),
    listGenres: vi.fn<CatalogService['listGenres']>().mockResolvedValue([]),
    getAvailableMedia: vi
      .fn<CatalogService['getAvailableMedia']>()
      .mockResolvedValue({ results: [], page: 1, totalPages: 0 }),
    getNextUnvotedMedia: vi.fn<CatalogService['getNextUnvotedMedia']>().mockResolvedValue({
      media: undefined,
      feedId: 'feed-1',
    }),
    ...overrides,
  };
}

export function createMockJellyfinService(
  overrides: Partial<Mocked<JellyfinService>> = {},
): Mocked<JellyfinService> {
  return {
    getSettings: vi.fn<JellyfinService['getSettings']>(),
    setSettings: vi.fn<JellyfinService['setSettings']>(),
    isConfigured: vi.fn<JellyfinService['isConfigured']>().mockReturnValue(false),
    testConnection: vi.fn<JellyfinService['testConnection']>().mockResolvedValue(false),
    testAndSync: vi.fn<JellyfinService['testAndSync']>(),
    listLibraryItems: vi.fn<JellyfinService['listLibraryItems']>(),
    resolveMediaUrl: vi.fn<JellyfinService['resolveMediaUrl']>(),
    ...overrides,
  };
}

export function createMockSchedulerService(
  overrides: Partial<Mocked<SchedulerService>> = {},
): Mocked<SchedulerService> {
  return {
    start: vi.fn<SchedulerService['start']>(),
    stop: vi.fn<SchedulerService['stop']>(),
    getState: vi.fn<SchedulerService['getState']>(),
    startOrchestration: vi.fn<SchedulerService['startOrchestration']>(),
    stopOrchestration: vi.fn<SchedulerService['stopOrchestration']>(),
    trigger: vi.fn<SchedulerService['trigger']>(),
    ...overrides,
  };
}

export function createMockLoggerService(
  overrides: Partial<Mocked<LoggerService>> = {},
): Mocked<LoggerService> {
  return {
    debug: vi.fn<LoggerService['debug']>(),
    info: vi.fn<LoggerService['info']>(),
    error: vi.fn<LoggerService['error']>(),
    warn: vi.fn<LoggerService['warn']>(),
    ...overrides,
  };
}

export function createMockSchedulerContext(
  db: Database,
  overrides: Partial<SchedulerContext> = {},
): SchedulerContext {
  return {
    db,
    log: createMockLoggerService(),
    tmdb: createMockTMDBService(),
    jellyfin: createMockJellyfinService(),
    scheduler: createMockSchedulerService(),
    ...overrides,
  };
}
