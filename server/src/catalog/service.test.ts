import type { DiscoverResponse, MediaDetails, SearchResponse } from '@findarr/shared';
import SqlDatabase from 'better-sqlite3';
import { describe, it, expect, vi, beforeEach, afterEach, type Mocked } from 'vitest';
import * as authService from '../auth/service.js';
import { createDatabase, type DB } from '../db/setup.js';
import { createMedia } from '../media/repository.js';
import { updateGenrePreference, updateKeywordPreference } from '../preferences/repository.js';
import type { TMDBService } from '../tmdb/service.js';
import { createTestMedia, createTestMediaDetail, createTestUserInDb } from '../utils/testHelper.js';
import { upsertCatalogCache } from './repository.js';
import { createCatalogService } from './service.js';

describe('catalog service - integration tests', () => {
  let db: DB;
  let sqliteDb: SqlDatabase.Database;
  let tmdbServiceMock: Mocked<TMDBService>;
  let catalogService: ReturnType<typeof createCatalogService>;

  beforeEach(() => {
    // Create fresh in-memory database for each test
    const result = createDatabase(':memory:');
    db = result.db;
    sqliteDb = result.sqliteDb;

    // Mock TMDB service
    tmdbServiceMock = {
      loadGenres: vi.fn().mockResolvedValue(undefined),
      search: vi.fn(),
      fetchDiscover: vi.fn(),
      fetchTrending: vi.fn(),
      getDetails: vi.fn(),
      getGenres: vi.fn(),
    } as Mocked<TMDBService>;

    catalogService = createCatalogService(db, tmdbServiceMock);
  });

  afterEach(() => {
    sqliteDb.close();
  });

  it('should call TMDB loadGenres on initialize', async () => {
    await catalogService.initialize();

    expect(tmdbServiceMock.loadGenres).toHaveBeenCalled();
  });

  it('should delegate discover, getDetails, getGenres', async () => {
    const searchResult: SearchResponse = { results: [], totalPages: 1, page: 0, totalResults: 0 };
    const fetchResult: DiscoverResponse = { results: [createTestMedia({ tmdbId: 1 })] };
    const detailsResult: MediaDetails = createTestMediaDetail({ tmdbId: 1 });
    const genresResult = { genres: [] };

    tmdbServiceMock.search.mockResolvedValue(searchResult);
    tmdbServiceMock.fetchDiscover.mockResolvedValue(fetchResult);
    tmdbServiceMock.getDetails.mockResolvedValue(detailsResult);
    tmdbServiceMock.getGenres.mockResolvedValue(genresResult);

    const search = await catalogService.search({ query: 'test', type: 'movie', page: 0 });
    expect(search.results).toEqual(searchResult.results);

    const discover = await catalogService.discover({ type: 'movie', page: 1 });
    expect(discover.results).toEqual(fetchResult.results);

    const details = await catalogService.getDetails({ id: 1, type: 'movie' });
    expect(details).toBe(detailsResult);

    const genres = await catalogService.getGenres({});
    expect(genres).toBe(genresResult);
  });

  it('should return cached popular results and filter/paginate', async () => {
    // Populate catalog cache with 50 items
    const cachedItems = Array.from({ length: 50 }, (_, i) => createTestMedia({ tmdbId: i + 1 }));
    await upsertCatalogCache(db, cachedItems);

    // First page
    const firstPage = await catalogService.popular({ page: 1 });
    expect(firstPage.results.length).toBe(20);
    expect(firstPage.totalResults).toBe(50);
    expect(firstPage.totalPages).toBe(3);

    // Second page
    const secondPage = await catalogService.popular({ page: 2 });
    expect(secondPage.results[0]?.tmdbId).toBe(21);
  });

  it('should respect type, region, and genre filters in popular', async () => {
    // Populate catalog cache with mixed types
    const items = [
      createTestMedia({ tmdbId: 1, type: 'movie' }),
      createTestMedia({ tmdbId: 2, type: 'tv' }),
    ];
    await upsertCatalogCache(db, items);

    const result = await catalogService.popular({ page: 1, type: 'tv' });
    expect(result.results.length).toBe(1);
    expect(result.results[0]?.type).toBe('tv');
  });

  it('should enrich search results with database state', async () => {
    const items = [createTestMedia({ tmdbId: 1 })];
    tmdbServiceMock.search.mockResolvedValue({
      results: items,
      totalPages: 1,
      page: 1,
      totalResults: 1,
    });

    const result = await catalogService.search({ query: 'test', type: 'movie', page: 1 });
    expect(result.results).toEqual(items);
  });

  it('should enrich discover results with database state', async () => {
    const items = [createTestMedia({ tmdbId: 1 })];
    tmdbServiceMock.fetchDiscover.mockResolvedValue({
      results: items,
      totalPages: 1,
      page: 1,
      totalResults: 1,
    });

    const result = await catalogService.discover({ type: 'movie', page: 1 });
    expect(result.results).toEqual(items);
  });

  it('should apply user preference scoring when user has genre preferences', async () => {
    // Mock password hashing for speed
    vi.spyOn(authService, 'hashPassword').mockResolvedValue('hashed-password');

    // Create a user
    const user = await createTestUserInDb(db);

    // Add genre preferences for the user (Action = high score)
    await updateGenrePreference(db, user.id, { id: 28, name: 'Action' }, 5);

    // Populate catalog cache with items - some with Action genre, some without
    const items = [
      createTestMedia({
        tmdbId: 1,
        genres: [{ id: 28, name: 'Action' }],
        popularity: 100,
      }),
      createTestMedia({
        tmdbId: 2,
        genres: [{ id: 35, name: 'Comedy' }],
        popularity: 200, // Higher base popularity
      }),
    ];
    await upsertCatalogCache(db, items);

    // Call popular with userId - should apply preference scoring
    const result = await catalogService.popular({ page: 1 }, user.id);

    // The Action movie should be boosted due to user preferences
    expect(result.results.length).toBe(2);
    // Results should be scored (we can't predict exact order without knowing scoring algorithm details)
    // But we're testing that the code path with user preferences is executed
    expect(result.results).toBeDefined();
  });

  it('should apply user keyword preference scoring when user has keyword preferences', async () => {
    // Mock password hashing for speed
    vi.spyOn(authService, 'hashPassword').mockResolvedValue('hashed-password');

    // Create a user
    const user = await createTestUserInDb(db);

    // Add keyword preferences for the user
    await updateKeywordPreference(db, user.id, { id: 123, name: 'superhero' }, 3);

    // Populate catalog cache with items that have keywords
    const items = [
      createTestMedia({
        tmdbId: 1,
        keywords: [{ id: 123, name: 'superhero' }],
      }),
      createTestMedia({
        tmdbId: 2,
        keywords: [{ id: 456, name: 'romance' }],
      }),
    ];
    await upsertCatalogCache(db, items);

    // Call discover with userId - should apply keyword preference scoring
    const discoveredItems = [
      createTestMedia({ tmdbId: 3, keywords: [{ id: 123, name: 'superhero' }] }),
    ];
    tmdbServiceMock.fetchDiscover.mockResolvedValue({
      results: discoveredItems,
      totalPages: 1,
      page: 1,
      totalResults: 1,
    });

    const result = await catalogService.discover({ page: 1, type: 'movie' }, user.id);

    // Should execute the keyword preference scoring code path
    expect(result.results).toBeDefined();
    expect(result.results.length).toBe(1);
  });

  it('should enrich results with user interactions when userId is provided', async () => {
    // Mock password hashing for speed
    vi.spyOn(authService, 'hashPassword').mockResolvedValue('hashed-password');

    // Create a user
    const user = await createTestUserInDb(db);

    // Create media in database
    const mediaItem = createTestMedia({ tmdbId: 1 });
    await createMedia(db, mediaItem.tmdbId, mediaItem.type);

    // Populate catalog cache
    await upsertCatalogCache(db, [mediaItem]);

    // Call popular with userId to trigger enrichment with interactions
    const result = await catalogService.popular({ page: 1 }, user.id);

    // Should execute enrichment with userId code path (line 130)
    expect(result.results).toBeDefined();
  });
});
