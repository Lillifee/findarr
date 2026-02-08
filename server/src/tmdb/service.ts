import type {
  SearchQuery,
  DiscoverQuery,
  DetailsQuery,
  GenresQuery,
  SearchResponse,
  Genre,
  DiscoverResponse,
  MediaDetails,
} from '@findarr/shared';
import { TMDBClient } from './client.js';
import { buildDiscoverParams } from './helpers.js';
import { TMDBTrendingParams } from './schemas.js';
import { transformMedia, transformDetails } from './transformers.js';

/**
 * TMDB Service - handles data fetching from TMDB API
 * Pure data operations without business logic or caching
 */
export function createTMDBService(tmdbClient: TMDBClient) {
  const genreMap = new Map<number, Genre>();

  /**
   * Load genres once at startup
   */
  async function loadGenres(): Promise<void> {
    const [movieGenres, tvGenres] = await Promise.all([
      tmdbClient.getGenres('movie', { language: 'en-US' }),
      tmdbClient.getGenres('tv', { language: 'en-US' }),
    ]);

    [...movieGenres.genres, ...tvGenres.genres].forEach(genre => {
      genreMap.set(genre.id, genre);
    });
  }

  /**
   * Search for movies and TV shows
   */
  async function search(params: SearchQuery): Promise<SearchResponse> {
    const { query, type = 'both', page = 1, language = 'en-US' } = params;
    const region = language.includes('-') ? language.split('-')[1] : 'US';

    const searchTypes = type === 'both' ? (['movie', 'tv'] as const) : ([type] as const);
    const promises = searchTypes.map(searchType =>
      tmdbClient.search(searchType, { query, page, language, region })
    );

    const searchResponses = await Promise.all(promises);

    const allResults = searchResponses.flatMap(response =>
      response.results.map(item => transformMedia(item, genreMap))
    );

    const sortedResults = allResults.sort((a, b) => b.popularity - a.popularity);
    const totalPages = Math.max(...searchResponses.map(response => response.total_pages));
    const totalResults = searchResponses.reduce((sum, response) => sum + response.total_results, 0);

    return {
      page,
      results: sortedResults,
      total_pages: totalPages,
      total_results: totalResults,
    };
  }

  /**
   * Fetch discover results from TMDB
   * Fetches specified pages and transforms to application format
   */
  async function fetchDiscover(params: DiscoverQuery, pages?: number[]): Promise<DiscoverResponse> {
    const { type = 'both', page = 1 } = params;

    const discoverTypes = type === 'both' ? (['movie', 'tv'] as const) : ([type] as const);
    const pagesToFetch = pages ?? [page];

    const discoverParams = buildDiscoverParams(params);
    const discoverPromises = discoverTypes.flatMap(discoverType =>
      pagesToFetch.map(pageNum =>
        tmdbClient.discover(discoverType, { ...discoverParams, page: pageNum })
      )
    );

    const responses = await Promise.all(discoverPromises);

    const results = responses.flatMap(response =>
      response.results.map(item => transformMedia(item, genreMap))
    );

    // Aggregate pagination metadata (max of both types)
    const total_pages = Math.max(...responses.map(r => r.total_pages));
    const total_results = responses.reduce((sum, r) => sum + r.total_results, 0);

    return { results, page, total_pages, total_results };
  }

  /**
   * Fetch trending results from TMDB
   * Fetches specified pages and transforms to application format
   */
  async function fetchTrending(
    params: TMDBTrendingParams = {},
    pages?: number[]
  ): Promise<DiscoverResponse> {
    const { language = 'en-US', time_window = 'week' } = params;

    const pagesToFetch = pages ?? [1];
    const ranks: Record<'movie' | 'tv', number> = { movie: 0, tv: 0 };

    const responses = await Promise.all(
      (['movie', 'tv'] as const).flatMap(type =>
        pagesToFetch.map(page => tmdbClient.getTrending(type, { language, time_window, page }))
      )
    );

    const results = responses.flatMap(({ results }) =>
      results.map(item => {
        const type = item.type as 'movie' | 'tv';
        const trending_rank = ++ranks[type];

        return transformMedia(item, genreMap, { trending_rank });
      })
    );

    const total_pages = Math.max(...responses.map(r => r.total_pages));
    const total_results = responses.reduce((sum, r) => sum + r.total_results, 0);

    return { results, page: 1, total_pages, total_results };
  }

  /**
   * Get movie or TV show details
   */
  async function getDetails(params: DetailsQuery): Promise<MediaDetails> {
    const { id, type, language = 'en-US' } = params;

    const tmdbMovie = await tmdbClient.getDetails(type, { id, language });
    return transformDetails(tmdbMovie);
  }

  /**
   * Get all genres
   */
  async function getGenres(_params: GenresQuery): Promise<{ genres: Genre[] }> {
    const allGenres = Array.from(genreMap.values());
    return { genres: allGenres };
  }

  return {
    loadGenres,
    search,
    fetchDiscover,
    fetchTrending,
    getDetails,
    getGenres,
  };
}

export type TMDBService = ReturnType<typeof createTMDBService>;
