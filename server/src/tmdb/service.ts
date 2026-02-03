import type {
  SearchQuery,
  DiscoverQuery,
  DetailsQuery,
  GenresQuery,
  Movie,
  TVShow,
  MovieDetails,
  TVDetails,
  SearchResponse,
  Genre,
} from '@findarr/shared';
import type { TMDBClient } from './client';
import type { TMDBMovie, TMDBTVShow } from './schemas';
import {
  transformMovie,
  transformTVShow,
  transformMovieDetails,
  transformTVDetails,
  buildRegionFilters,
  buildDateParams,
  filterByCriteria,
  type FilterCriteria,
} from './';

/**
 * TMDB Service - handles data fetching from TMDB API
 * Pure data operations without business logic
 */
export function createTMDBService(tmdbClient: TMDBClient) {
  const genreMap = new Map<number, Genre>();

  // Trending cache: stores all trending results for fast filtering
  const trendingCache = new Map<
    'movie' | 'tv',
    {
      results: (Movie | TVShow)[];
      fetchedAt: Date;
    }
  >();

  const TRENDING_TTL = 6 * 60 * 60 * 1000; // 6 hours (TMDB trending updates weekly)

  /**
   * Load genres once at startup
   */
  async function loadGenres(): Promise<void> {
    const [movieGenres, tvGenres] = await Promise.all([
      tmdbClient.getMovieGenres({ language: 'en-US' }),
      tmdbClient.getTVGenres({ language: 'en-US' }),
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
      searchType === 'movie'
        ? tmdbClient.searchMovies({ query, page, language, region })
        : tmdbClient.searchTV({ query, page, language })
    );

    const searchResponses = await Promise.all(promises);

    const allResults = searchResponses.flatMap(response =>
      response.results.map(item =>
        item.type === 'movie' ? transformMovie(item, genreMap) : transformTVShow(item, genreMap)
      )
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
   * Fetch discover results (5 pages in parallel for better coverage)
   */
  async function fetchDiscover(params: DiscoverQuery): Promise<(Movie | TVShow)[]> {
    const {
      type = 'both',
      language = 'en-US',
      recent_days,
      region_groups = [],
      with_genres,
    } = params;

    const region = language.includes('-') ? language.split('-')[1] : 'US';
    const { languageFilter, countryFilter } = buildRegionFilters(region_groups);
    const dateParams = buildDateParams(recent_days, type);
    const discoverTypes = type === 'both' ? (['movie', 'tv'] as const) : ([type] as const);

    const discoverPromises = discoverTypes.flatMap(discoverType =>
      [1, 2, 3, 4, 5].map(page => {
        const baseParams = {
          page,
          sort_by: 'popularity.desc',
          language,
          region,
          watch_region: region,
          ...(languageFilter && { with_original_language: languageFilter }),
          ...(countryFilter && { with_origin_country: countryFilter }),
          ...(with_genres && { with_genres }),
          ...dateParams,
        };

        return discoverType === 'movie'
          ? tmdbClient.discoverMovies(baseParams)
          : tmdbClient.discoverTV(baseParams);
      })
    );

    const responses = await Promise.all(discoverPromises);

    return responses.flatMap(response => {
      return response.results.map(item =>
        item.type === 'movie'
          ? transformMovie(item, genreMap, { is_trending: false })
          : transformTVShow(item, genreMap, { is_trending: false })
      );
    });
  }

  /**
   * Fetch all trending results with caching
   * Fetches 10 pages (~200 items) and caches for 6 hours
   */
  async function fetchTrendingWithCache(type: 'movie' | 'tv'): Promise<(Movie | TVShow)[]> {
    const cached = trendingCache.get(type);
    const now = new Date();

    // Return cache if still fresh
    if (cached && now.getTime() - cached.fetchedAt.getTime() < TRENDING_TTL) {
      return cached.results;
    }

    // Fetch all 10 pages in parallel
    const promises = Array.from({ length: 10 }, (_, i) =>
      type === 'movie'
        ? tmdbClient.getTrendingMovies({ time_window: 'week', page: i + 1 })
        : tmdbClient.getTrendingTV({ time_window: 'week', page: i + 1 })
    );

    const responses = await Promise.all(promises);

    // Transform all results
    const allResults = responses.flatMap(response =>
      response.results.map(item =>
        item.type === 'movie'
          ? transformMovie(item as TMDBMovie, genreMap, { is_trending: true })
          : transformTVShow(item as TMDBTVShow, genreMap, { is_trending: true })
      )
    );

    // Cache for next time
    trendingCache.set(type, {
      results: allResults,
      fetchedAt: now,
    });

    return allResults;
  }

  /**
   * Fetch trending results for discover operation
   * Filters cached results on-the-fly
   */
  async function fetchTrending(params: DiscoverQuery): Promise<(Movie | TVShow)[]> {
    const { type = 'both', region_groups = [], with_genres } = params;

    const { languageFilter, countryFilter } = buildRegionFilters(region_groups);
    const filters: FilterCriteria = {
      type,
      languageFilter,
      countryFilter,
      genresFilter: with_genres,
    };

    const discoverTypes = type === 'both' ? (['movie', 'tv'] as const) : ([type] as const);

    // Fetch from cache (or refresh cache if stale)
    const allTrending = await Promise.all(
      discoverTypes.map(discoverType => fetchTrendingWithCache(discoverType))
    );

    // Filter and return top 50
    return allTrending.flat().filter(item => filterByCriteria(item, filters));
  }

  /**
   * Get movie or TV show details
   */
  async function getDetails(params: DetailsQuery): Promise<MovieDetails | TVDetails> {
    const { id, type, language = 'en-US' } = params;

    if (type === 'movie') {
      const tmdbMovie = await tmdbClient.getMovieDetails({ id, language });
      return transformMovieDetails(tmdbMovie);
    } else {
      const tmdbTV = await tmdbClient.getTVDetails({ id, language });
      return transformTVDetails(tmdbTV);
    }
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
