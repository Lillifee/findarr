import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { TMDBClient } from './client.js';
import { createTMDBService } from './service.js';

describe('TMDBService', () => {
  let mockClient: {
    getGenres: ReturnType<typeof vi.fn>;
    discover: ReturnType<typeof vi.fn>;
    search: ReturnType<typeof vi.fn>;
    getTrending: ReturnType<typeof vi.fn>;
    getDetails?: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      getGenres: vi.fn(),
      discover: vi.fn(),
      search: vi.fn(),
      getTrending: vi.fn(),
    };
  });

  describe('getGenres', () => {
    it('should return combined genres', async () => {
      mockClient.getGenres
        .mockResolvedValueOnce({
          genres: [{ id: 1, name: 'Action' }],
        })
        .mockResolvedValueOnce({
          genres: [{ id: 2, name: 'Drama' }],
        });

      const service = createTMDBService(mockClient as unknown as TMDBClient);
      await service.loadGenres();

      const result = await service.getGenres({});
      expect(result.genres.length).toBe(2);
    });
  });

  describe('fetchDiscover', () => {
    it('should fetch discover results for a single type', async () => {
      mockClient.discover.mockResolvedValue({
        page: 1,
        results: [],
        total_pages: 2,
        total_results: 5,
      });

      mockClient.getGenres.mockResolvedValue({ genres: [] });

      const service = createTMDBService(mockClient as unknown as TMDBClient);
      await service.loadGenres();

      const result = await service.fetchDiscover({ type: 'movie' });

      expect(mockClient.discover).toHaveBeenCalledTimes(1);
      expect(result.totalPages).toBe(2);
      expect(result.totalResults).toBe(5);
    });

    it('should aggregate results for both types and multiple pages', async () => {
      mockClient.discover
        // movie page 1
        .mockResolvedValueOnce({
          page: 1,
          results: [],
          total_pages: 2,
          total_results: 1,
        })
        // movie page 2
        .mockResolvedValueOnce({
          page: 2,
          results: [],
          total_pages: 3,
          total_results: 2,
        })
        // tv page 1
        .mockResolvedValueOnce({
          page: 1,
          results: [],
          total_pages: 4,
          total_results: 3,
        })
        // tv page 2
        .mockResolvedValueOnce({
          page: 2,
          results: [],
          total_pages: 5,
          total_results: 4,
        });

      mockClient.getGenres.mockResolvedValue({ genres: [] });

      const service = createTMDBService(mockClient as unknown as TMDBClient);
      await service.loadGenres();

      const result = await service.fetchDiscover({ type: 'both', page: 1 }, [1, 2]);

      expect(mockClient.discover).toHaveBeenCalledTimes(4);
      expect(result.totalPages).toBe(5); // max
      expect(result.totalResults).toBe(10); // sum
    });
  });

  describe('search', () => {
    it('should aggregate search results for both types', async () => {
      mockClient.search
        .mockResolvedValueOnce({
          page: 1,
          results: [{ id: 1 }],
          total_pages: 1,
          total_results: 1,
        })
        .mockResolvedValueOnce({
          page: 1,
          results: [{ id: 2 }],
          total_pages: 1,
          total_results: 1,
        });

      const service = createTMDBService(mockClient as unknown as TMDBClient);

      const result = await service.search({
        query: 'test',
        type: 'both',
        page: 1,
      });

      expect(result.results.length).toBe(2);
      expect(result.totalResults).toBe(2);
    });

    it('should search only one type when specified', async () => {
      mockClient.search.mockResolvedValue({
        page: 1,
        results: [{ id: 1 }],
        total_pages: 1,
        total_results: 1,
      });

      const service = createTMDBService(mockClient as unknown as TMDBClient);

      const result = await service.search({
        query: 'movie',
        type: 'movie',
        page: 1,
      });

      expect(mockClient.search).toHaveBeenCalledTimes(1);
      expect(result.totalResults).toBe(1);
    });

    it('should fallback to US region if language has no region part', async () => {
      mockClient.search.mockResolvedValue({
        page: 1,
        results: [],
        total_pages: 1,
        total_results: 0,
      });

      const service = createTMDBService(mockClient as unknown as TMDBClient);

      await service.search({
        query: 'test',
        type: 'movie',
        page: 1,
        language: 'en', // No region part
      });

      expect(mockClient.search).toHaveBeenCalledWith('movie', {
        query: 'test',
        page: 1,
        language: 'en',
        region: 'US', // Should default to US
      });
    });
  });

  describe('fetchTrending', () => {
    it('should assign separate trending ranks per media type', async () => {
      mockClient.getTrending
        .mockResolvedValueOnce({
          page: 1,
          results: [
            {
              id: 1,
              type: 'movie',
              title: 'Movie 1',
              release_date: null,
              original_title: 'Movie 1',
              overview: null,
              poster_path: null,
              backdrop_path: null,
              vote_average: 5,
              vote_count: 5,
              popularity: 10,
              genre_ids: [],
              original_language: 'en',
            },
          ],
          total_pages: 1,
          total_results: 1,
        })
        .mockResolvedValueOnce({
          page: 1,
          results: [
            {
              id: 2,
              type: 'tv',
              name: 'Show 1',
              first_air_date: null,
              original_name: 'Show 1',
              overview: null,
              poster_path: null,
              backdrop_path: null,
              vote_average: 6,
              vote_count: 6,
              popularity: 20,
              genre_ids: [],
              original_language: 'en',
              origin_country: ['US'],
            },
          ],
          total_pages: 1,
          total_results: 1,
        });

      mockClient.getGenres.mockResolvedValue({ genres: [] });

      const service = createTMDBService(mockClient as unknown as TMDBClient);
      await service.loadGenres();

      const result = await service.fetchTrending();

      expect(result.results.length).toBe(2);
      expect(result.results[0]?.trendingRank).toBe(1);
      expect(result.results[1]?.trendingRank).toBe(1);
    });

    it('should handle empty trending results', async () => {
      mockClient.getTrending
        .mockResolvedValueOnce({
          page: 1,
          results: [],
          total_pages: 1,
          total_results: 0,
        })
        .mockResolvedValueOnce({
          page: 1,
          results: [],
          total_pages: 1,
          total_results: 0,
        });

      mockClient.getGenres.mockResolvedValue({ genres: [] });

      const service = createTMDBService(mockClient as unknown as TMDBClient);
      await service.loadGenres();

      const result = await service.fetchTrending();

      expect(result.results).toEqual([]);
    });
  });

  describe('getDetails', () => {
    it('should return transformed media details', async () => {
      mockClient.getDetails = vi.fn().mockResolvedValue({
        id: 1,
        type: 'movie',
        title: 'Test Movie',
        release_date: '2024-01-01',
        original_title: 'Test Movie',
        overview: 'Overview',
        poster_path: '/poster.jpg',
        backdrop_path: '/backdrop.jpg',
        vote_average: 8.5,
        vote_count: 200,
        popularity: 100,
        original_language: 'en',
        genres: [],
        runtime: 120,
        budget: 1_000_000,
        revenue: 5_000_000,
        status: 'Released',
        tagline: 'Tagline',
        homepage: 'https://example.com',
        imdb_id: 'tt1234567',
      });

      const service = createTMDBService(mockClient as unknown as TMDBClient);
      const result = await service.getDetails({ id: 1, type: 'movie' });

      expect(result).toBeDefined();
      expect(result.tmdbId).toBe(1);
      expect(mockClient.getDetails).toHaveBeenCalledWith('movie', { id: 1, language: 'en-US' });
    });

    it('should pass custom language to TMDB client', async () => {
      mockClient.getDetails = vi.fn().mockResolvedValue({
        id: 2,
        type: 'tv',
        name: 'Test Show',
        first_air_date: '2024-01-01',
        original_name: 'Test Show',
        overview: 'Overview',
        poster_path: '/poster.jpg',
        backdrop_path: '/backdrop.jpg',
        vote_average: 8,
        vote_count: 150,
        popularity: 80,
        original_language: 'en',
        origin_country: ['US'],
        genres: [],
        episode_run_time: [45],
        number_of_episodes: 10,
        number_of_seasons: 1,
        status: 'Returning Series',
        show_type: 'Scripted',
        homepage: null,
      });

      const service = createTMDBService(mockClient as unknown as TMDBClient);
      await service.getDetails({ id: 2, type: 'tv', language: 'de-DE' });

      expect(mockClient.getDetails).toHaveBeenCalledWith('tv', { id: 2, language: 'de-DE' });
    });
  });
});
