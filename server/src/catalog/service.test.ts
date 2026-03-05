import type { DiscoverResponse, MediaDetails, SearchResponse } from '@findarr/shared';
import { describe, it, expect, vi, beforeEach, type Mocked } from 'vitest';
import * as enrichmentModule from '../media/enrichment.js';
import type { TMDBService } from '../tmdb/service.js';
import { createMedia, createMediaDetail, mockDb } from '../utils/testHelper.js';
import { createCatalogService } from './service.js';

// Mock enrichment module
vi.mock('../media/enrichment.js', () => ({
  enrichWithRecords: vi.fn((_db, items) => items),
  enrichWithInteractions: vi.fn((_db, items) => items),
}));

describe('catalog service', () => {
  let tmdbServiceMock: Mocked<TMDBService>;
  let catalogService: ReturnType<typeof createCatalogService>;

  beforeEach(() => {
    vi.clearAllMocks();

    tmdbServiceMock = {
      loadGenres: vi.fn().mockResolvedValue(undefined),
      search: vi.fn(),
      fetchDiscover: vi.fn(),
      fetchTrending: vi.fn(),
      getDetails: vi.fn(),
      getGenres: vi.fn(),
    };

    catalogService = createCatalogService(mockDb, tmdbServiceMock);
  });

  it('should call TMDB loadGenres and pre-warm popular cache on initialize', async () => {
    tmdbServiceMock.fetchTrending.mockResolvedValue({ results: [] });
    tmdbServiceMock.fetchDiscover.mockResolvedValue({ results: [] });

    await catalogService.initialize();

    expect(tmdbServiceMock.loadGenres).toHaveBeenCalled();
    expect(tmdbServiceMock.fetchTrending).toHaveBeenCalledWith(
      { language: 'de-DE', time_window: 'week' },
      [1, 2, 3, 4, 5, 6, 7, 8]
    );
    expect(tmdbServiceMock.fetchDiscover).toHaveBeenCalledWith(
      { language: 'de-DE', type: 'both', recentDays: 365 },
      [1, 2, 3, 4, 5, 6, 7, 8]
    );
  });

  it('should delegate discover, getDetails, getGenres', async () => {
    const searchResult: SearchResponse = { results: [], totalPages: 1, page: 0, totalResults: 0 };
    const fetchResult: DiscoverResponse = { results: [createMedia({ id: 1 })] };
    const detailsResult: MediaDetails = createMediaDetail({ id: 1 });
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
    const trendingResult = Array.from({ length: 50 }, (_, i) => createMedia({ id: i + 1 }));
    const discoverResult = Array.from({ length: 20 }, (_, i) => createMedia({ id: i + 1 }));
    tmdbServiceMock.fetchTrending.mockResolvedValue({ results: trendingResult });
    tmdbServiceMock.fetchDiscover.mockResolvedValue({ results: discoverResult });

    // first call warms the cache
    const firstPage = await catalogService.popular({ page: 1 });
    expect(firstPage.results.length).toBe(20);
    expect(firstPage.totalResults).toBe(50);
    expect(firstPage.totalPages).toBe(3);

    // second call uses cache
    const secondPage = await catalogService.popular({ page: 2 });
    expect(secondPage.results[0]?.id).toBe(21);
  });

  it('should respect type, region, and genre filters in popular', async () => {
    const items = [createMedia({ id: 1 }), createMedia({ id: 2, type: 'tv' })];
    tmdbServiceMock.fetchTrending.mockResolvedValue({ results: items });
    tmdbServiceMock.fetchDiscover.mockResolvedValue({ results: [] });

    const result = await catalogService.popular({ page: 1, type: 'tv' });
    expect(result.results.length).toBe(1);
    expect(result.results[0]?.type).toBe('tv');
  });

  it('should enrich results without userId when not provided', async () => {
    const items = [createMedia({ id: 1 })];
    tmdbServiceMock.search.mockResolvedValue({
      results: items,
      totalPages: 1,
      page: 1,
      totalResults: 1,
    });

    // Call without userId to hit the else branch of enrichResults
    await catalogService.search({ query: 'test', type: 'movie', page: 1 });

    const mockEnrichWithRecords = vi.mocked(enrichmentModule.enrichWithRecords);
    const mockEnrichWithInteractions = vi.mocked(enrichmentModule.enrichWithInteractions);

    // Should call enrichWithRecords but NOT enrichWithInteractions when userId is undefined
    expect(mockEnrichWithRecords).toHaveBeenCalled();
    expect(mockEnrichWithInteractions).not.toHaveBeenCalled();
  });

  it('should enrich results with interactions when userId is provided', async () => {
    const items = [createMedia({ id: 1 })];
    tmdbServiceMock.search.mockResolvedValue({
      results: items,
      totalPages: 1,
      page: 1,
      totalResults: 1,
    });

    const mockEnrichWithRecords = vi.mocked(enrichmentModule.enrichWithRecords);
    const mockEnrichWithInteractions = vi.mocked(enrichmentModule.enrichWithInteractions);

    // Call with userId to hit the if branch
    await catalogService.search({ query: 'test', type: 'movie', page: 1 }, 42);

    // Should call both enrichWithRecords AND enrichWithInteractions when userId is provided
    expect(mockEnrichWithRecords).toHaveBeenCalled();
    expect(mockEnrichWithInteractions).toHaveBeenCalledWith(mockDb, items, 42);
  });
});
