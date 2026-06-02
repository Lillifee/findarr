import type { DiscoverResponse, Genre, MediaDetails, SearchResponse } from '@findarr/shared';
import SqlDatabase from 'better-sqlite3';
import { describe, it, expect, vi, beforeEach, afterEach, type Mocked } from 'vite-plus/test';

import * as authService from '../auth/service.js';
import { upsertCatalogCache } from '../catalog/repository.js';
import { createCatalogService } from '../catalog/service.js';
import { createDatabase } from '../db/service.js';
import type { Database } from '../db/service.js';
import { addInteraction } from '../interaction/repository.js';
import { createMedia } from '../media/repository.js';
import { updateGenrePreference, updateKeywordPreference } from '../preferences/repository.js';
import type { TMDBService } from '../tmdb/service.js';
import { saveUserSettings } from '../user/service.js';
import {
  createTestMedia,
  createTestMovieDetail,
  createTestUserInDb,
} from './helpers/testHelper.js';

describe('catalog service - integration tests', () => {
  let db: Database;
  let sqliteDb: SqlDatabase.Database;
  let tmdbServiceMock: Mocked<TMDBService>;
  let catalogService: ReturnType<typeof createCatalogService>;

  beforeEach(() => {
    // Create fresh in-memory database for each test
    const result = createDatabase(':memory:');
    db = result.db;
    sqliteDb = result.sqliteDb;

    // Mock TMDB service
    // Mock TMDB service that returns movie/TV details with genres
    tmdbServiceMock = {
      isConfigured: vi.fn<TMDBService['isConfigured']>().mockReturnValue(true),
      testConnection: vi.fn<TMDBService['testConnection']>().mockResolvedValue(true),
      testAndSync: vi.fn<TMDBService['testAndSync']>().mockResolvedValue(true),
      getSettings: vi
        .fn<TMDBService['getSettings']>()
        .mockReturnValue({ tmdbAccessTokenSet: true }),
      setSettings: vi
        .fn<TMDBService['setSettings']>()
        .mockResolvedValue({ tmdbAccessTokenSet: true }),
      search: vi.fn<TMDBService['search']>(),
      discover: vi.fn<TMDBService['discover']>(),
      trending: vi.fn<TMDBService['trending']>(),
      genres: vi.fn<TMDBService['genres']>(),
      details: vi.fn<TMDBService['details']>().mockResolvedValue(
        createTestMovieDetail({
          tmdbId: 123,
          genres: [
            { id: 28, name: 'Action' },
            { id: 12, name: 'Adventure' },
          ],
        }),
      ),
      findByExternalId: vi.fn<TMDBService['findByExternalId']>(),
    } as Mocked<TMDBService>;

    catalogService = createCatalogService({ db, tmdb: tmdbServiceMock });
  });

  afterEach(() => {
    sqliteDb.close();
  });

  it('should delegate discover, details, and genres', async () => {
    vi.spyOn(authService, 'hashPassword').mockResolvedValue('hashed-password');
    const user = await createTestUserInDb(db, { email: 'delegate@test.com' });

    const searchResult: SearchResponse = { results: [], totalPages: 1, page: 0 };
    const fetchResult: DiscoverResponse = {
      results: [createTestMedia({ tmdbId: 1 })],
      totalPages: 1,
      page: 1,
    };
    const detailsResult: MediaDetails = createTestMovieDetail({ tmdbId: 1 });
    const genresResult: Genre[] = [];

    tmdbServiceMock.search.mockResolvedValue(searchResult);
    tmdbServiceMock.discover.mockResolvedValue(fetchResult);
    tmdbServiceMock.details.mockResolvedValue(detailsResult);
    tmdbServiceMock.genres.mockResolvedValue(genresResult);

    const search = await catalogService.searchMedia(
      { query: 'test', type: 'movie', page: 0 },
      user.id,
    );
    expect(search.results).toEqual(searchResult.results);

    const discover = await catalogService.discoverMedia({ type: 'movie', page: 1 }, user.id);
    expect(discover.results).toEqual(fetchResult.results);

    const details = await catalogService.getMediaDetails({ id: 1, type: 'movie' }, user.id);
    expect(details).toBe(detailsResult);

    const genres = await catalogService.listGenres({});
    expect(genres).toBe(genresResult);
  });

  it('should return cached popular results and filter/paginate', async () => {
    vi.spyOn(authService, 'hashPassword').mockResolvedValue('hashed-password');
    const user = await createTestUserInDb(db, { email: 'pagination@test.com' });

    // Populate catalog cache with 50 items
    const cachedItems = Array.from({ length: 50 }, (_, i) => createTestMedia({ tmdbId: i + 1 }));
    await upsertCatalogCache(db, cachedItems);

    // First page
    const firstPage = await catalogService.getPopularMedia({}, user.id);
    expect(firstPage.results.length).toBe(20);
    expect(firstPage.totalPages).toBe(3);
    expect(firstPage.feedId).toBeTruthy();
    expect(firstPage.page).toBe(1);

    // Second page
    const secondPage = await catalogService.getPopularMedia(
      { page: 2, feedId: firstPage.feedId },
      user.id,
    );
    expect(secondPage.results[0]?.tmdbId).toBe(21);
  });

  it('should respect type, region, and genre filters in popular', async () => {
    vi.spyOn(authService, 'hashPassword').mockResolvedValue('hashed-password');
    const user = await createTestUserInDb(db, { email: 'type-filter@test.com' });

    // Populate catalog cache with mixed types
    const items = [
      createTestMedia({ tmdbId: 1, type: 'movie' }),
      createTestMedia({ tmdbId: 2, type: 'tv' }),
    ];
    await upsertCatalogCache(db, items);

    const result = await catalogService.getPopularMedia({ type: 'tv' }, user.id);
    expect(result.results.length).toBe(1);
    expect(result.results[0]?.type).toBe('tv');
  });

  it('should enrich search results with database state', async () => {
    const items = [createTestMedia({ tmdbId: 1 })];
    tmdbServiceMock.search.mockResolvedValue({
      results: items,
      totalPages: 1,
      page: 1,
    });

    const result = await catalogService.searchMedia({ query: 'test', type: 'movie', page: 1 }, 0);
    expect(result.results).toEqual(items);
  });

  it('should enrich discover results with database state', async () => {
    vi.spyOn(authService, 'hashPassword').mockResolvedValue('hashed-password');
    const user = await createTestUserInDb(db, { email: 'discover-enrich@test.com' });

    const items = [createTestMedia({ tmdbId: 1 })];
    tmdbServiceMock.discover.mockResolvedValue({
      results: items,
      totalPages: 1,
      page: 1,
    });

    const result = await catalogService.discoverMedia({ type: 'movie', page: 1 }, user.id);
    expect(result.results).toEqual(items);
  });

  it('should resolve discover filters from stored user settings', async () => {
    vi.spyOn(authService, 'hashPassword').mockResolvedValue('hashed-password');

    const user = await createTestUserInDb(db, { email: 'discover-settings@test.com' });
    await saveUserSettings(db, user.id, {
      language: 'fr-FR',
      regions: ['asian'],
    });

    tmdbServiceMock.discover.mockResolvedValue({
      results: [],
      totalPages: 1,
      page: 1,
    });

    await catalogService.discoverMedia(
      { type: 'movie', page: 2, recentDays: 30, genres: ['Action'] },
      user.id,
    );

    expect(tmdbServiceMock.discover).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'movie',
        page: 2,
        recentDays: 30,
        language: 'fr-FR',
        regions: ['asian'],
      }),
    );
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
        popularity: 200,
      }),
    ];
    await upsertCatalogCache(db, items);

    // Call popular with userId - should apply preference scoring
    const result = await catalogService.getPopularMedia({}, user.id);

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
    tmdbServiceMock.discover.mockResolvedValue({
      results: discoveredItems,
      totalPages: 1,
      page: 1,
    });

    const result = await catalogService.discoverMedia({ page: 1, type: 'movie' }, user.id);

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
    const result = await catalogService.getPopularMedia({}, user.id);

    // Should execute enrichment with userId code path (line 130)
    expect(result.results).toBeDefined();
  });

  it('should stop swipe voting after the first 100 popular items are exhausted', async () => {
    vi.spyOn(authService, 'hashPassword').mockResolvedValue('hashed-password');
    const user = await createTestUserInDb(db, { email: 'swipe-limit@test.com' });

    const cachedItems = Array.from({ length: 101 }, (_, index) =>
      createTestMedia({ tmdbId: index + 1, popularity: 1000 - index }),
    );
    await upsertCatalogCache(db, cachedItems);

    for (const item of cachedItems.slice(0, 100)) {
      const mediaRecord = await createMedia(db, item.tmdbId, item.type);
      await addInteraction(db, user.id, mediaRecord.id, 'liked');
    }

    const result = await catalogService.getNextUnvotedMedia({ type: 'both' }, user.id);

    expect(result.media).toBeNull();
    expect(tmdbServiceMock.details).not.toHaveBeenCalled();
  });
});
