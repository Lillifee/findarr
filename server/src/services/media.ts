import type {
  SearchQuery,
  DiscoverQuery,
  PopularQuery,
  DetailsQuery,
  GenresQuery,
  MovieDetails,
  TVDetails,
  SearchResponse,
  DiscoverResponse,
  Genre,
  Movie,
  TVShow,
} from '@findarr/shared';
import type { TMDBService } from '../tmdb/service';
import { calculateCustomPopularity, createTrendingScoreMap } from './scoring';
import { buildRegionFilters, filterByCriteria } from '../tmdb/helpers';

/**
 * Media service - orchestrates multiple data sources and applies business logic
 * Currently uses TMDB, can be extended with Radarr/Sonarr/etc.
 */
export function createMediaService(tmdbService: TMDBService) {
  // Cache TTL: 6 hours (TMDB trending updates weekly)
  const CACHE_TTL = 6 * 60 * 60 * 1000;

  // Popular cache: stores final scored and deduplicated results
  let popularCache:
    | {
        results: (Movie | TVShow)[]; // Already scored, deduplicated, and sorted
        fetchedAt: Date;
        language: string;
      }
    | undefined;

  /**
   * Initialize all data sources and pre-warm cache
   */
  async function initialize() {
    await tmdbService.loadGenres();

    // Pre-warm popular cache with de-DE
    await fetchAndCachePopular('de-DE');
  }

  /**
   * Search for media across all sources
   * Currently delegates to TMDB
   */
  async function search(params: SearchQuery): Promise<SearchResponse> {
    return tmdbService.search(params);
  }

  /**
   * Internal: Fetch both trending and discover, apply scoring, and cache the result
   */
  async function fetchAndCachePopular(language: string): Promise<(Movie | TVShow)[]> {
    // Fetch 5 pages each from trending and discover
    const [trendingResults, discoverResult] = await Promise.all([
      tmdbService.fetchTrending([1, 2, 3, 4, 5]),
      tmdbService.fetchDiscover({ type: 'both', language, recent_days: 30 }, [1, 2, 3, 4, 5]),
    ]);

    const discoverResults = discoverResult.results;

    // Create trending score map
    const trendingScoreMap = createTrendingScoreMap(trendingResults);

    // Apply custom scoring to all results
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

    // Remove duplicates (prefer trending version if exists)
    const uniqueResults = allResultsWithScoring.reduce<(Movie | TVShow)[]>((acc, item) => {
      const existing = acc.find(u => u.id === item.id);
      if (!existing) {
        acc.push(item);
      } else if (item.is_trending && !existing.is_trending) {
        const index = acc.indexOf(existing);
        acc[index] = item;
      }
      return acc;
    }, []);

    // Sort by custom popularity
    const sortedResults = uniqueResults.sort(
      (a, b) => (b.custom_popularity || 0) - (a.custom_popularity || 0)
    );

    // Update cache
    popularCache = {
      results: sortedResults,
      fetchedAt: new Date(),
      language,
    };

    return sortedResults;
  }

  /**
   * Popular media - cached discover + trending with custom scoring
   * Uses pre-fetched and scored pools for instant filtering and pagination
   */
  async function popular(params: PopularQuery): Promise<DiscoverResponse> {
    const { page = 1, type = 'both', language = 'en-US' } = params;
    const now = new Date();

    // Fetch and cache if needed, otherwise use cached results
    const allResults =
      popularCache &&
      popularCache.language === language &&
      now.getTime() - popularCache.fetchedAt.getTime() < CACHE_TTL
        ? popularCache?.results
        : await fetchAndCachePopular(language);

    // Filter by type, region, and genre
    const { languageFilter, countryFilter } = buildRegionFilters(params.region_groups || []);
    const filters = {
      type,
      languageFilter,
      countryFilter,
      genresFilter: params.with_genres,
    };

    const filteredResults = allResults.filter(item => filterByCriteria(item, filters));

    // Paginate (20 items per page)
    const ITEMS_PER_PAGE = 20;
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedResults = filteredResults.slice(startIndex, endIndex);

    return {
      results: paginatedResults,
      page,
      total_pages: Math.ceil(filteredResults.length / ITEMS_PER_PAGE),
      total_results: filteredResults.length,
    };
  }

  /**
   * Discover media - direct TMDB passthrough for browse mode
   * Allows custom date ranges and filters without caching
   */
  async function discover(params: DiscoverQuery): Promise<DiscoverResponse> {
    return await tmdbService.fetchDiscover(params);
  }

  /**
   * Get detailed information about a media item
   * Currently delegates to TMDB
   */
  async function getDetails(params: DetailsQuery): Promise<MovieDetails | TVDetails> {
    return tmdbService.getDetails(params);
  }

  /**
   * Get all available genres
   * Currently delegates to TMDB
   */
  async function getGenres(params: GenresQuery): Promise<{ genres: Genre[] }> {
    return tmdbService.getGenres(params);
  }

  return { initialize, search, popular, discover, getDetails, getGenres };
}

export type MediaService = ReturnType<typeof createMediaService>;
