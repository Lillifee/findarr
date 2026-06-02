import SqlDatabase from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { arrConfig } from '../arr/config.js';
import {
  batchUpdateMediaStatuses,
  listMediaWithArrIds,
  updateMediaIds,
} from '../arr/repository.js';
import type { ArrQueueItem } from '../arr/schemas.js';
import type { AnyArrService } from '../arr/service.js';
import { syncQueue } from '../arr/sync.js';
import { createDatabase, type Database } from '../db/service.js';
import { createMedia, getMediaByTmdbId } from '../media/repository.js';
import type { SchedulerContext } from '../scheduler/types.js';

describe('arr sync collision handling - integration tests', () => {
  let db: Database;
  let sqliteDb: SqlDatabase.Database;

  beforeEach(() => {
    const result = createDatabase(':memory:');
    db = result.db;
    sqliteDb = result.sqliteDb;
  });

  afterEach(() => {
    sqliteDb.close();
  });

  it('should update only the matching media type when arrId collides', async () => {
    const movie = await createMedia(db, 123, 'movie');
    const show = await createMedia(db, 456, 'tv');

    await updateMediaIds(db, movie.id, { arrId: 42, arrUrl: '/movie/123' });
    await updateMediaIds(db, show.id, { arrId: 42, arrUrl: '/series/test-show' });

    await batchUpdateMediaStatuses(db, [{ arrId: 42, type: 'movie', status: 'warning' }]);

    const updatedMovie = await getMediaByTmdbId(db, 123, 'movie');
    const updatedShow = await getMediaByTmdbId(db, 456, 'tv');

    expect(updatedMovie?.status).toBe('warning');
    expect(updatedShow?.status).toBe('pending');
  });

  it('should filter media with arr ids by requested type', async () => {
    const movie = await createMedia(db, 123, 'movie');
    const show = await createMedia(db, 456, 'tv');

    await updateMediaIds(db, movie.id, { arrId: 11, arrUrl: '/movie/123' });
    await updateMediaIds(db, show.id, { arrId: 22, arrUrl: '/series/test-show' });

    const movieRows = await listMediaWithArrIds(db, 'movie');

    expect(movieRows).toHaveLength(1);
    expect(movieRows[0]?.type).toBe('movie');
    expect(movieRows[0]?.arrId).toBe(11);
  });

  it('should scope queue updates to the current arr service media type', async () => {
    const movie = await createMedia(db, 123, 'movie');
    const show = await createMedia(db, 456, 'tv');

    await updateMediaIds(db, movie.id, { arrId: 77, arrUrl: '/movie/123' });
    await updateMediaIds(db, show.id, { arrId: 77, arrUrl: '/series/test-show' });

    // TODO create a shared test helper to create mocks
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const fastify: SchedulerContext = {
      db,
      log: {
        warn: vi.fn<() => void>(),
      },
    } as unknown as SchedulerContext;

    const radarrService: AnyArrService = {
      config: arrConfig.radarr,
      getQueue: vi.fn<(pageSize: number) => Promise<ArrQueueItem[]>>().mockResolvedValue([
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        { arrId: 77, trackedDownloadStatus: 'downloading', id: 1 } as ArrQueueItem,
      ]),
      getSettings: vi.fn<AnyArrService['getSettings']>().mockResolvedValue({
        apiKeySet: true,
        qualityProfileId: 1,
        rootFolderPath: 'path',
        url: '192.168.1.14:7878',
      }),
      testConnection: vi.fn<AnyArrService['testConnection']>().mockResolvedValue(true),
      testAndSync: vi.fn<AnyArrService['testAndSync']>().mockResolvedValue(true),
      isConfigured: vi.fn<AnyArrService['isConfigured']>().mockReturnValue(true),
      listLibraryItems: vi.fn<AnyArrService['listLibraryItems']>().mockResolvedValue([]),
      listQualityProfiles: vi.fn<AnyArrService['listQualityProfiles']>().mockResolvedValue([]),
      listRootFolders: vi.fn<AnyArrService['listRootFolders']>().mockResolvedValue([]),
      requestMedia: vi.fn<AnyArrService['requestMedia']>().mockResolvedValue(undefined),
      resolveMediaUrl: vi
        .fn<AnyArrService['resolveMediaUrl']>()
        .mockResolvedValue('http://example.com/media'),
      setSettings: vi.fn<AnyArrService['setSettings']>().mockResolvedValue({
        apiKeySet: true,
        qualityProfileId: 1,
        rootFolderPath: 'path',
        url: '192.168.1.14:7878',
      }),
    };

    await syncQueue(fastify, radarrService, new Set());

    const updatedMovie = await getMediaByTmdbId(db, 123, 'movie');
    const updatedShow = await getMediaByTmdbId(db, 456, 'tv');

    expect(updatedMovie?.status).toBe('downloading');
    expect(updatedShow?.status).toBe('pending');
  });
});
