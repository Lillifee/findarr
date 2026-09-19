import type { MediaDetails, SearchResponse } from '@findarr/shared/media';
import type SqlDatabase from 'better-sqlite3';
import type { Mocked } from 'vite-plus/test';

import * as authUtils from '../auth/utils.js';
import { upsertCatalogCache } from '../catalog/repository.js';
import { createCatalogService } from '../catalog/service.js';
import { createDatabase, type Database } from '../db/service.js';
import { addInteraction } from '../interaction/repository.js';
import { createMedia } from '../media/repository.js';
import { createMediaService } from '../media/service.js';
import type { TMDBService } from '../tmdb/service.js';
import { createUserService, type UserService } from '../user/service.js';
import { createMockAppLogger, createMockTMDBService } from './helpers/mockServices.js';
import {
  createTestMedia,
  createTestMovieDetail,
  createTestUserInDb,
} from './helpers/testHelper.js';

describe('catalog service - integration tests', () => {
  let db: Database;
  let sqliteDb: SqlDatabase.Database;
  let tmdbService: Mocked<TMDBService>;
  let userService: UserService;
  let catalogService: ReturnType<typeof createCatalogService>;

  beforeEach(() => {
    // Create fresh in-memory database for each test
    const result = createDatabase(':memory:');
    ({ db } = result);
    ({ sqliteDb } = result);

    userService = createUserService({ db });

    // Mock TMDB service that returns movie/TV details with genres
    tmdbService = createMockTMDBService({
      details: vi.fn<TMDBService['details']>().mockResolvedValue(
        createTestMovieDetail({
          tmdbId: 123,
          genres: [
            { id: 28, name: 'Action' },
            { id: 12, name: 'Adventure' },
          ],
        }),
      ),
    });

    const appLogService = createMockAppLogger();
    const mediaService = createMediaService({
      db,
      tmdb: tmdbService,
      user: userService,
      appLog: appLogService,
    });
    catalogService = createCatalogService({
      db,
      tmdb: tmdbService,
      user: userService,
      media: mediaService,
      appLog: appLogService,
    });
  });

  afterEach(() => {
    sqliteDb.close();
  });

  it('should delegate search and details', async () => {
    vi.spyOn(authUtils, 'hashPassword').mockResolvedValue('hashed-password');
    const user = await createTestUserInDb(db, { email: 'delegate@test.com' });

    const searchResult: SearchResponse = {
      results: [],
      genres: [],
      people: [],
      keywords: [],
      page: 0,
    };
    const detailsResult: MediaDetails = createTestMovieDetail({ tmdbId: 1 });
    tmdbService.searchMedia.mockResolvedValue(searchResult);
    tmdbService.searchPeople.mockResolvedValue(searchResult.people);
    tmdbService.details.mockResolvedValue(detailsResult);

    const search = await catalogService.search({ query: 'test', type: 'movie', page: 0 }, user.id);
    expect(search.results).toStrictEqual(searchResult.results);

    const details = await catalogService.getMediaDetails({ id: 1, type: 'movie' }, user.id);
    expect(details).toBe(detailsResult);
  });

  it('should return people and keywords and discover media by person, keyword, or genre', async () => {
    const user = await createTestUserInDb(db, { email: 'cast-discover@test.com' });
    const movie = createTestMedia({ tmdbId: 1, type: 'movie' });
    tmdbService.searchPeople.mockResolvedValue([
      { tmdbId: 1, name: 'Actor', profilePath: undefined, knownForDepartment: 'Acting' },
      { tmdbId: 2, name: 'Director', profilePath: undefined, knownForDepartment: 'Directing' },
    ]);
    tmdbService.searchKeywords.mockResolvedValue([{ id: 1, name: 'superhero' }]);
    tmdbService.searchGenres.mockResolvedValue([{ id: 1, name: 'Test genre' }]);
    tmdbService.discoverMedia.mockResolvedValue({ page: 1, results: [movie] });

    const search = await catalogService.search({ query: 'test', type: 'both', page: 1 }, user.id);
    const personDiscovery = await catalogService.getDiscoveryFeed(
      { person: [1], genre: [], keyword: [], page: 1, type: 'movie' },
      user.id,
    );
    const keywordDiscovery = await catalogService.getDiscoveryFeed(
      { person: [], genre: [], keyword: [1], page: 1, type: 'tv' },
      user.id,
    );
    const genreDiscovery = await catalogService.getDiscoveryFeed(
      { person: [], genre: [28], keyword: [], page: 1, type: 'both' },
      user.id,
    );

    expect(search.people).toStrictEqual([
      { tmdbId: 1, name: 'Actor', profilePath: undefined, knownForDepartment: 'Acting' },
      { tmdbId: 2, name: 'Director', profilePath: undefined, knownForDepartment: 'Directing' },
    ]);
    expect(search.keywords).toStrictEqual([{ id: 1, name: 'superhero' }]);
    expect(search.genres).toStrictEqual([{ id: 1, name: 'Test genre' }]);
    expect(tmdbService.discoverMedia).toHaveBeenCalledWith(
      expect.objectContaining({ person: [1] }),
    );
    expect(tmdbService.discoverMedia).toHaveBeenCalledWith(
      expect.objectContaining({ keyword: [1] }),
    );
    expect(tmdbService.discoverMedia).toHaveBeenCalledWith(
      expect.objectContaining({ genre: [28] }),
    );
    expect(personDiscovery).toMatchObject({
      results: [movie],
    });
    expect(keywordDiscovery).toMatchObject({
      results: [movie],
    });
    expect(genreDiscovery).toMatchObject({
      results: [movie],
    });
  });

  it('should delegate discovery without filters', async () => {
    const user = await createTestUserInDb(db, { email: 'empty-discover@test.com' });

    const result = await catalogService.getDiscoveryFeed(
      { person: [], genre: [], keyword: [], page: 1, type: 'both' },
      user.id,
    );

    expect(tmdbService.discoverMedia).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ person: [], genre: [], keyword: [], type: 'both' }),
    );
    expect(result).toMatchObject({ results: [] });
  });

  it('should enrich search results with database state', async () => {
    const user = await createTestUserInDb(db, { email: 'discover-enrich@test.com' });
    const items = [createTestMedia({ tmdbId: 1 })];
    tmdbService.searchMedia.mockResolvedValue({
      results: items,
      page: 1,
    });

    const result = await catalogService.search({ query: 'test', type: 'movie', page: 1 }, user.id);
    expect(result.results).toStrictEqual(items);
  });

  it('should return the bounded vote queue and the next catalog window separately', async () => {
    vi.spyOn(authUtils, 'hashPassword').mockResolvedValue('hashed-password');
    const user = await createTestUserInDb(db, { email: 'vote-queue@test.com' });
    const cachedItems = Array.from({ length: 102 }, (_, index) =>
      createTestMedia({ tmdbId: index + 1, popularity: 1000 - index }),
    );
    await upsertCatalogCache(db, cachedItems);

    const nextVotedMediaRecord = await createMedia(db, 101, 'movie');
    await addInteraction(db, user.id, nextVotedMediaRecord.id, 'liked');

    const result = await catalogService.getVotingFeed(
      { type: 'both', page: 1, interaction: 'all' },
      user.id,
    );

    expect(result.results).toHaveLength(100);
    expect(result.results.at(-1)?.tmdbId).toBe(100);
    expect(result.nextResults.map((item) => item.tmdbId)).toStrictEqual([102]);
  });
});
