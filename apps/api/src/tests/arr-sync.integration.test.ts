import type SqlDatabase from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import {
  batchUpdateMediaStatuses,
  listMediaWithArrIds,
  updateMediaIds,
} from '../arr/repository.js';
import type { ArrQueueItem } from '../arr/schemas.js';
import { syncQueue } from '../arr/sync.js';
import { createDatabase, type Database } from '../db/service.js';
import { createMedia, getMediaByTmdbId } from '../media/repository.js';
import { createMockRadarrService, createMockSchedulerContext } from './helpers/mockServices.js';

describe('arr sync collision handling - integration tests', () => {
  let db: Database;
  let sqliteDb: SqlDatabase.Database;

  beforeEach(() => {
    const result = createDatabase(':memory:');
    ({ db } = result);
    ({ sqliteDb } = result);
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
    expect(movieRows[0]).toBe(11);
  });

  it('should scope queue updates to the current arr service media type', async () => {
    const movie = await createMedia(db, 123, 'movie');
    const show = await createMedia(db, 456, 'tv');

    await updateMediaIds(db, movie.id, { arrId: 77, arrUrl: '/movie/123' });
    await updateMediaIds(db, show.id, { arrId: 77, arrUrl: '/series/test-show' });

    const fastify = createMockSchedulerContext(db);

    const radarrService = createMockRadarrService({
      getQueue: vi.fn<(pageSize: number) => Promise<ArrQueueItem[]>>().mockResolvedValue([
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        { arrId: 77, trackedDownloadStatus: 'downloading', id: 1 } as ArrQueueItem,
      ]),
    });

    await syncQueue(fastify, radarrService, new Set());

    const updatedMovie = await getMediaByTmdbId(db, 123, 'movie');
    const updatedShow = await getMediaByTmdbId(db, 456, 'tv');

    expect(updatedMovie?.status).toBe('downloading');
    expect(updatedShow?.status).toBe('pending');
  });
});
