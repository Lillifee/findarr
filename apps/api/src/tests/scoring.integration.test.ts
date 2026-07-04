import { unifiedGenres } from '@findarr/shared/constants';
import type { Genre } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';
import type SqlDatabase from 'better-sqlite3';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vite-plus/test';

import * as authUtils from '../auth/utils.js';
import { computeCatalogMediaStats } from '../catalog/repository.js';
import { createCatalogService } from '../catalog/service.js';
import { syncCatalogCache } from '../catalog/sync.js';
import { createDatabase, type Database } from '../db/service.js';
import { updateGenrePreference, updateKeywordPreference } from '../preferences/repository.js';
import { TMDBSearchResponseSchema } from '../tmdb/schemas.js';
import type { TMDBService } from '../tmdb/service.js';
import { transformMedia } from '../tmdb/transformers.js';
import { loadFixture } from './helpers/fixtureHelper.js';
import {
  createMockAppLogger,
  createMockSchedulerContext,
  createMockTMDBService,
} from './helpers/mockServices.js';
import { createTestUserInDb } from './helpers/testHelper.js';

// Helper to round score values for snapshots
const toFixed2 = (value: number | undefined) =>
  isDefined(value) ? Number(value.toFixed(2)) : undefined;

const FIXED_NOW = new Date('2025-01-01T00:00:00.000Z');

describe('Popular Scoring Integration Tests - Real TMDB Data', () => {
  let db: Database;
  let sqliteDb: SqlDatabase.Database;
  let catalogService: ReturnType<typeof createCatalogService>;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);

    // Create fresh in-memory database
    const result = createDatabase(':memory:');
    ({ db } = result);
    ({ sqliteDb } = result);

    // Load fixture responses
    const trendingWeeklyRaw = loadFixture('tmdb/trending-weekly.json');
    const popularMoviesRaw = loadFixture('tmdb/popular-movies.json');
    const popularTVRaw = loadFixture('tmdb/popular-tv.json');

    // Parse through Zod schemas
    const trendingWeekly = TMDBSearchResponseSchema.parse(trendingWeeklyRaw);
    const popularMovies = TMDBSearchResponseSchema.parse(popularMoviesRaw);
    const popularTV = TMDBSearchResponseSchema.parse(popularTVRaw);

    // Build genre map from unifiedGenres for transformMedia
    const genreMap = new Map<number, Genre>();
    for (const [_key, genre] of Object.entries(unifiedGenres)) {
      for (const id of genre.ids) {
        if (!genreMap.has(id)) {
          genreMap.set(id, { id, name: genre.name });
        }
      }
    }

    // Transform fixture responses to Media[] (like the real service does)
    const trendingItems = trendingWeekly.results.map((item, index) =>
      transformMedia(item, genreMap, { trendingRank: index + 1 }),
    );
    const movieItems = popularMovies.results.map((item) => transformMedia(item, genreMap));
    const tvItems = popularTV.results.map((item) => transformMedia(item, genreMap));

    // Mock TMDB service with fixture data (already transformed)
    const tmdbServiceMock = createMockTMDBService({
      discover: vi.fn<TMDBService['discover']>().mockResolvedValue({
        results: [...movieItems, ...tvItems],
        page: 1,
        totalPages: 1,
      }),
      trending: vi.fn<TMDBService['trending']>().mockResolvedValue({
        results: trendingItems,
        page: 1,
        totalPages: 1,
      }),
      genres: vi.fn<TMDBService['genres']>().mockResolvedValue([...genreMap.values()]),
    });

    // Create mock Fastify instance for sync function
    const mockFastify = createMockSchedulerContext(db, { tmdb: tmdbServiceMock });

    // Use the actual sync logic with mocked TMDB responses
    await syncCatalogCache(mockFastify);

    // Create catalog service for testing
    catalogService = createCatalogService({
      db,
      tmdb: tmdbServiceMock,
      appLog: createMockAppLogger(),
    });
  });

  afterEach(() => {
    sqliteDb.close();
    vi.useRealTimers();
  });

  async function createCatalogUser(email: string) {
    vi.spyOn(authUtils, 'hashPassword').mockResolvedValue('hashed-password');
    return createTestUserInDb(db, { email });
  }

  it('should score and sort popular media consistently - no user', async () => {
    // Get popular without user preferences
    const user = await createCatalogUser('popular-no-user@test.com');
    const page1 = await catalogService.getPopularMedia({ type: 'both' }, user.id);

    // Extract relevant scoring data for snapshot (round to avoid floating-point precision issues)
    const scoringSnapshot = page1.results.map((item) => ({
      name: item.name,
      type: item.type,
      tmdbId: item.tmdbId,
      baseScore: toFixed2(item.state?.score?.baseScore),
      baseTrendingScore: toFixed2(item.state?.score?.baseTrendingScore),
      genreScore: toFixed2(item.state?.score?.genreScore),
      keywordScore: toFixed2(item.state?.score?.keywordScore),
      userScore: toFixed2(item.state?.score?.userScore),
      finalScore: toFixed2(item.state?.score?.finalScore),
      finalTrendingScore: toFixed2(item.state?.score?.finalTrendingScore),
    }));

    // Verify ordering is by finalTrendingScore (descending)
    for (let i = 1; i < scoringSnapshot.length; i += 1) {
      const prev = scoringSnapshot[i - 1]?.finalTrendingScore ?? 0;
      const curr = scoringSnapshot[i]?.finalTrendingScore ?? 0;
      expect(prev).toBeGreaterThanOrEqual(curr);
    }

    // Snapshot the ordering and scores
    expect(scoringSnapshot).toMatchSnapshot('popular-scoring-no-user');
  });

  it('should score and sort popular media with user preferences', async () => {
    // Mock password hashing for speed
    vi.spyOn(authUtils, 'hashPassword').mockResolvedValue('hashed-password');

    // Create a user
    const user = await createTestUserInDb(db);

    // Add strong genre preferences
    // Action (28), Thriller (53), Drama (18) = high scores
    await updateGenrePreference(db, user.id, { id: 28, name: 'Action' }, 5);
    await updateGenrePreference(db, user.id, { id: 53, name: 'Thriller' }, 4);
    await updateGenrePreference(db, user.id, { id: 18, name: 'Drama' }, 3);

    // Comedy (35) = negative score
    await updateGenrePreference(db, user.id, { id: 35, name: 'Comedy' }, -3);

    // Add keyword preference (dystopia, based on novel)
    await updateKeywordPreference(db, user.id, { id: 4565, name: 'dystopia' }, 5);
    await updateKeywordPreference(db, user.id, { id: 818, name: 'based on novel or book' }, 3);

    // Get popular with user preferences
    const page1 = await catalogService.getPopularMedia({ type: 'both' }, user.id);

    // Extract relevant scoring data for snapshot (round to avoid floating-point precision issues)
    const scoringSnapshot = page1.results.map((item) => ({
      name: item.name,
      type: item.type,
      tmdbId: item.tmdbId,
      baseScore: toFixed2(item.state?.score?.baseScore),
      genreScore: toFixed2(item.state?.score?.genreScore),
      keywordScore: toFixed2(item.state?.score?.keywordScore),
      userScore: toFixed2(item.state?.score?.userScore),
      finalScore: toFixed2(item.state?.score?.finalScore),
      finalTrendingScore: toFixed2(item.state?.score?.finalTrendingScore),
    }));

    // Verify ordering is by finalTrendingScore (descending)
    for (let i = 1; i < scoringSnapshot.length; i += 1) {
      const prev = scoringSnapshot[i - 1]?.finalTrendingScore ?? 0;
      const curr = scoringSnapshot[i]?.finalTrendingScore ?? 0;
      expect(prev).toBeGreaterThanOrEqual(curr);
    }

    // Snapshot the ordering and scores with user preferences
    expect(scoringSnapshot).toMatchSnapshot('popular-scoring-with-user-preferences');
  });

  it('should apply genre filtering to popular results', async () => {
    vi.spyOn(authUtils, 'hashPassword').mockResolvedValue('hashed-password');

    const user = await createTestUserInDb(db, { email: 'genre-filter@test.com' });

    // Get popular filtered by Action genre from query filter
    const page1 = await catalogService.getPopularMedia(
      { type: 'both', genres: ['Action'] },
      user.id,
    );

    // All results should have Action genre (ID 28 for movies, 10759 for TV)
    for (const item of page1.results) {
      const hasAction = item.genres.some((g) => g.id === 28 || g.id === 10_759);
      expect(hasAction).toBe(true);
    }

    // Extract for snapshot
    const filterSnapshot = page1.results.map((item) => ({
      name: item.name,
      type: item.type,
      genres: item.genres.map((g) => g.name),
    }));

    expect(filterSnapshot).toMatchSnapshot('popular-action-genre-filter');
  });

  it('should mix movies and TV shows in popular results', async () => {
    const user = await createCatalogUser('popular-types@test.com');
    const page1 = await catalogService.getPopularMedia({ type: 'both' }, user.id);

    // Extract types
    const types = page1.results.map((item) => ({
      name: item.name,
      type: item.type,
      tmdbId: item.tmdbId,
    }));

    // Should have movies in trending/popular fixtures
    const hasMovies = types.some((t) => t.type === 'movie');
    expect(hasMovies).toBe(true);

    // Type distribution snapshot
    const typeDistribution = {
      movies: types.filter((t) => t.type === 'movie').length,
      tvShows: types.filter((t) => t.type === 'tv').length,
      total: types.length,
      items: types,
    };

    expect(typeDistribution).toMatchSnapshot('popular-type-distribution');
  });

  it('should compute stats from real fixtures (use to update TMDB_STAT_DEFAULTS)', async () => {
    // Compute stats from the loaded catalog
    const [movieStats, tvStats] = await Promise.all([
      computeCatalogMediaStats(db, 'movie'),
      computeCatalogMediaStats(db, 'tv'),
    ]);

    // Create snapshot with computed defaults (copy these to TMDB_STAT_DEFAULTS)
    const computedDefaults = {
      maxPopularity: Math.ceil(Math.max(movieStats.maxPopularity, tvStats.maxPopularity)),
      maxVoteCount: Math.ceil(Math.max(movieStats.maxVoteCount, tvStats.maxVoteCount)),
      avgRating: Math.ceil(Math.max(movieStats.avgRating, tvStats.avgRating)),
      movieStats: {
        maxPopularity: movieStats.maxPopularity,
        maxVoteCount: movieStats.maxVoteCount,
        avgRating: movieStats.avgRating,
      },
      tvStats: {
        maxPopularity: tvStats.maxPopularity,
        maxVoteCount: tvStats.maxVoteCount,
        avgRating: tvStats.avgRating,
      },
    };

    // Snapshot for easy copying to TMDB_STAT_DEFAULTS
    expect(computedDefaults).toMatchSnapshot('tmdb-stat-defaults');

    // Verify stats are reasonable (not all zeros)
    expect(movieStats.maxPopularity).toBeGreaterThan(0);
    expect(movieStats.maxVoteCount).toBeGreaterThan(0);
    expect(movieStats.avgRating).toBeGreaterThan(0);
    expect(tvStats.maxPopularity).toBeGreaterThan(0);
    expect(tvStats.maxVoteCount).toBeGreaterThan(0);
    expect(tvStats.avgRating).toBeGreaterThan(0);
  });
});
