import type { DiscoverResponse, MediaDetails, SearchResponse } from '@findarr/shared';
import { describe, it, expect, vi, beforeEach, type Mocked } from 'vitest';
import type { TMDBService } from '../tmdb/service.js';
import { createMedia, createMediaDetail } from '../utils/testHelper.js';
import { createMediaService } from './media.js';

describe('media service', () => {
  let tmdbServiceMock: Mocked<TMDBService>;
  let mediaService: ReturnType<typeof createMediaService>;

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

    mediaService = createMediaService(tmdbServiceMock);
  });

  it('should call TMDB loadGenres and pre-warm popular cache on initialize', async () => {
    tmdbServiceMock.fetchTrending.mockResolvedValue({ results: [] });
    tmdbServiceMock.fetchDiscover.mockResolvedValue({ results: [] });

    await mediaService.initialize();

    expect(tmdbServiceMock.loadGenres).toHaveBeenCalled();
    expect(tmdbServiceMock.fetchTrending).toHaveBeenCalledWith(
      { language: 'de-DE', time_window: 'week' },
      [1, 2, 3, 4, 5]
    );
    expect(tmdbServiceMock.fetchDiscover).toHaveBeenCalledWith(
      { language: 'de-DE', type: 'both', recentDays: 30 },
      [1, 2, 3, 4, 5]
    );
  });

  it('should delegate discover, getDetails, getGenres', async () => {
    const searchResult: SearchResponse = { results: [], total_pages: 1, page: 0, total_results: 0 };
    const fetchResult: DiscoverResponse = { results: [createMedia({ id: 1 })] };
    const detailsResult: MediaDetails = createMediaDetail({ id: 1 });
    const genresResult = { genres: [] };

    tmdbServiceMock.search.mockResolvedValue(searchResult);
    tmdbServiceMock.fetchDiscover.mockResolvedValue(fetchResult);
    tmdbServiceMock.getDetails.mockResolvedValue(detailsResult);
    tmdbServiceMock.getGenres.mockResolvedValue(genresResult);

    const search = await mediaService.search({ query: 'test', type: 'movie', page: 0 });
    expect(search).toBe(searchResult);

    const discover = await mediaService.discover({ type: 'movie', page: 1 });
    expect(discover).toBe(fetchResult);

    const details = await mediaService.getDetails({ id: 1, type: 'movie' });
    expect(details).toBe(detailsResult);

    const genres = await mediaService.getGenres({});
    expect(genres).toBe(genresResult);
  });

  it('should return cached popular results and filter/paginate', async () => {
    const trendingResult = Array.from({ length: 50 }, (_, i) => createMedia({ id: i + 1 }));
    const discoverResult = Array.from({ length: 20 }, (_, i) => createMedia({ id: i + 1 }));
    tmdbServiceMock.fetchTrending.mockResolvedValue({ results: trendingResult });
    tmdbServiceMock.fetchDiscover.mockResolvedValue({ results: discoverResult });

    // first call warms the cache
    const firstPage = await mediaService.popular({ page: 1 });
    expect(firstPage.results.length).toBe(20);
    expect(firstPage.total_results).toBe(50);
    expect(firstPage.total_pages).toBe(3);

    // second call uses cache
    const secondPage = await mediaService.popular({ page: 2 });
    expect(secondPage.results[0]?.id).toBe(21);
  });

  it('should respect type, region, and genre filters in popular', async () => {
    const items = [createMedia({ id: 1 }), createMedia({ id: 2, type: 'tv' })];
    tmdbServiceMock.fetchTrending.mockResolvedValue({ results: items });
    tmdbServiceMock.fetchDiscover.mockResolvedValue({ results: [] });

    const result = await mediaService.popular({ page: 1, type: 'tv' });
    expect(result.results.length).toBe(1);
    expect(result.results[0]?.type).toBe('tv');
  });
});
