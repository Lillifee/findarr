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
  DiscoverResponse,
  Genre,
} from '@findarr/shared';
import {
  type TMDBClient,
  transformMovie,
  transformTVShow,
  transformMovieDetails,
  transformTVDetails,
  buildRegionFilters,
  buildDateParams,
} from '../tmdb';

/**
 * Create a media service with TMDB client
 * Implements high-level business logic, orchestration, scoring, and filtering
 */
export function createMediaService(tmdbClient: TMDBClient) {
  const genreMap = new Map<number, Genre>();

  /**
   * Load genres once at startup
   */
  async function loadGenres() {
    // Fetch movie and TV genres in parallel
    const [movieGenres, tvGenres] = await Promise.all([
      tmdbClient.getMovieGenres({ language: 'en-US' }),
      tmdbClient.getTVGenres({ language: 'en-US' }),
    ]);

    // Populate genreMap with all genres
    [...movieGenres.genres, ...tvGenres.genres].forEach(genre => {
      genreMap.set(genre.id, genre);
    });
  }

  /**
   * Search for movies and TV shows
   */
  async function search(params: SearchQuery): Promise<SearchResponse> {
    const { query, type = 'both', page = 1, language = 'en-US' } = params;

    // Extract region from language code (e.g., 'de-DE' -> 'DE')
    const region = language.includes('-') ? language.split('-')[1] : 'US';

    // Collect promises based on search type
    const searchTypes = type === 'both' ? (['movie', 'tv'] as const) : ([type] as const);
    const promises = searchTypes.map(searchType =>
      searchType === 'movie'
        ? tmdbClient.searchMovies({ query, page, language, region })
        : tmdbClient.searchTV({ query, page, language })
    );

    const searchResponses = await Promise.all(promises);

    // Transform TMDB results to application types
    const allResults = searchResponses.flatMap(response =>
      response.results.map(item =>
        item.type === 'movie' ? transformMovie(item, genreMap) : transformTVShow(item, genreMap)
      )
    );

    const sortedResults = allResults.sort((a, b) => b.popularity - a.popularity);

    // Calculate totals
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
   * Discover media with advanced orchestration:
   * - Fetches multiple pages from discover endpoint
   * - Fetches trending data
   * - Applies custom scoring algorithm
   * - Filters and deduplicates results
   */
  async function discover(params: DiscoverQuery): Promise<DiscoverResponse> {
    const {
      type = 'both',
      language = 'en-US',
      recent_days,
      region_groups = [],
      with_genres,
    } = params;

    const region = language.includes('-') ? language.split('-')[1] : 'US';

    // Build filters
    const { languageFilter, countryFilter } = buildRegionFilters(region_groups);
    const dateParams = buildDateParams(recent_days, type);

    // Determine which types to fetch
    const discoverTypes = type === 'both' ? (['movie', 'tv'] as const) : ([type] as const);

    // Fetch discover and trending data in parallel
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

    const trendingPromises = discoverTypes.flatMap(discoverType =>
      [1, 2, 3].map(page =>
        discoverType === 'movie'
          ? tmdbClient.getTrendingMovies({ time_window: 'week', page })
          : tmdbClient.getTrendingTV({ time_window: 'week', page })
      )
    );

    const [discoverResponses, trendingResponses] = await Promise.all([
      Promise.all(discoverPromises),
      Promise.all(trendingPromises),
    ]);

    // Process and transform trending items
    const trendingTMDBResults = trendingResponses.flatMap(response => response.results);

    const trendingResults = trendingTMDBResults
      .map(item => {
        if ('title' in item) {
          return transformMovie(item, genreMap, { is_trending: true });
        } else {
          return transformTVShow(item, genreMap, { is_trending: true });
        }
      })
      .filter(x =>
        filterTrendingItem(x, {
          type,
          languageFilter,
          countryFilter,
          genresFilter: with_genres,
        })
      );

    // Process and transform regular discover results
    const discoverResults = discoverResponses.flatMap((response, index) => {
      const isMovie = index % 5 < 5 && discoverTypes[Math.floor(index / 5)] === 'movie';

      return response.results.map(item => {
        if (isMovie && 'title' in item) {
          return transformMovie(item, genreMap, { is_trending: false });
        } else if (!isMovie && 'name' in item) {
          return transformTVShow(item, genreMap, { is_trending: false });
        }
        // Fallback
        return 'title' in item
          ? transformMovie(item, genreMap, { is_trending: false })
          : transformTVShow(item, genreMap, { is_trending: false });
      });
    });

    // Create trending score map
    const trendingScoreMap = new Map<number, { trending_boost: number; trending_rank: number }>();
    trendingResults.forEach((item, index) => {
      const trendingBoost = Math.max(0, 500 - index * 10);
      trendingScoreMap.set(item.id, {
        trending_boost: trendingBoost,
        trending_rank: index + 1,
      });
    });

    // Apply custom scoring
    const allResultsWithScoring = [...trendingResults, ...discoverResults].map(item => {
      const trendingData = trendingScoreMap.get(item.id);
      const customPopularity = calculateCustomPopularity(
        item,
        trendingData?.trending_rank,
        trendingData?.trending_boost
      );

      return {
        ...item,
        custom_popularity: customPopularity,
        is_trending: !!trendingData,
        trending_rank: trendingData?.trending_rank,
      };
    });

    // Remove duplicates and sort
    const uniqueResults = deduplicateResults(allResultsWithScoring);
    const sortedResults = uniqueResults.sort(
      (a, b) => (b.custom_popularity || 0) - (a.custom_popularity || 0)
    );

    return { results: sortedResults };
  }

  /**
   * Get movie or TV show details
   *
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
   * Get genres
   */
  async function getGenres(_params: GenresQuery): Promise<{ genres: Genre[] }> {
    // Return genres from genreMap as array
    const allGenres = Array.from(genreMap.values());
    return { genres: allGenres };
  }

  /**
   * Filter trending items by discover criteria
   */
  function filterTrendingItem(
    item: Movie | TVShow,
    filters: {
      type: 'movie' | 'tv' | 'both';
      languageFilter: string;
      countryFilter: string;
      genresFilter?: string;
    }
  ) {
    // Media type filter
    if (filters.type !== 'both' && item.type !== filters.type) {
      return false;
    }

    // Language filter
    if (
      filters.languageFilter &&
      !filters.languageFilter.split('|').includes(item.original_language)
    ) {
      return false;
    }

    // Country filter
    if (filters.countryFilter && item.origin_country) {
      const itemCountries = Array.isArray(item.origin_country)
        ? item.origin_country
        : [item.origin_country];
      const allowedCountries = filters.countryFilter.split('|');
      if (!itemCountries.some(country => allowedCountries.includes(country))) {
        return false;
      }
    }

    // Genre filter
    if (filters.genresFilter && item.genres) {
      const selectedGenres = filters.genresFilter.split(',').map(Number);
      const itemGenres = item.genres.map(g => g.id);
      if (!selectedGenres.some(genreId => itemGenres.includes(genreId))) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate custom popularity score for an item
   */
  function calculateCustomPopularity(
    item: Movie | TVShow,
    trendingRank?: number,
    trendingBoost?: number
  ): number {
    const basePop = item.popularity || 0;
    const voteAverage = item.vote_average || 0;
    const voteCount = item.vote_count || 0;

    let customPopularity = basePop;

    // Apply trending boost
    if (trendingRank !== undefined && trendingBoost !== undefined) {
      customPopularity += trendingBoost;

      if (trendingRank <= 10) customPopularity += 200;
      if (trendingRank <= 5) customPopularity += 150;
      if (trendingRank === 1) customPopularity += 200;
    }

    // Apply vote-based quality boost
    if (voteCount > 0 && voteAverage > 0) {
      const qualityBoost = Math.max(0, (voteAverage - 6) * 10);

      let ageAdjustedVoteCount = voteCount;
      let agePenalty = 0;
      let recencyBoost = 0;

      if (item.date) {
        const releaseYear = new Date(item.date).getFullYear();
        const currentYear = new Date().getFullYear();
        const ageInYears = Math.max(1, currentYear - releaseYear);

        // Age-adjusted vote count
        ageAdjustedVoteCount = voteCount / Math.sqrt(ageInYears);

        // Age penalties
        if (ageInYears >= 8) {
          const ageFactor = Math.min(ageInYears - 7, 35);
          agePenalty = Math.pow(1.4, ageFactor) - 1;
        }
        if (ageInYears >= 15) agePenalty += 100;
        if (ageInYears >= 20) agePenalty += 200;
        if (ageInYears >= 30) agePenalty += 400;

        // Recency boosts
        if (ageInYears <= 5) {
          const recencyMap = [30, 25, 20, 15, 10, 5];
          recencyBoost = recencyMap[ageInYears] || 0;
        }
      }

      const volumeBoost = Math.min(15, Math.log10(ageAdjustedVoteCount + 1) * 6);
      let voteBoost = qualityBoost + volumeBoost;

      const exceptionalBoost = voteAverage >= 8.5 && ageAdjustedVoteCount >= 500 ? 10 : 0;
      voteBoost = Math.min(50, voteBoost + exceptionalBoost);

      customPopularity += voteBoost + recencyBoost - agePenalty;
    }

    return customPopularity;
  }

  /**
   * Remove duplicate items, preferring trending versions
   */
  function deduplicateResults(results: (Movie | TVShow)[]) {
    return results.reduce<(Movie | TVShow)[]>((acc, item) => {
      const existing = acc.find(u => u.id === item.id);
      if (!existing) {
        acc.push(item);
      } else if (item.is_trending && !existing.is_trending) {
        const index = acc.indexOf(existing);
        acc[index] = item;
      }
      return acc;
    }, []);
  }

  return { loadGenres, search, discover, getDetails, getGenres };
}

export type MediaService = ReturnType<typeof createMediaService>;
