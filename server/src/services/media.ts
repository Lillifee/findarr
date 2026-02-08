import type {
  SearchQuery,
  DiscoverQuery,
  PopularQuery,
  DetailsQuery,
  GenresQuery,
  SearchResponse,
  DiscoverResponse,
  Genre,
  Media,
  MediaDetails,
} from '@findarr/shared';
import type { TMDBService } from '../tmdb/service.js';
import { calculateCustomPopularity } from './scoring.js';
import { filterByCriteria } from './filter.js';

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
        results: Media[];
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
  async function getDetails(params: DetailsQuery): Promise<MediaDetails> {
    return tmdbService.getDetails(params);
  }

  /**
   * Get all available genres
   * Currently delegates to TMDB
   */
  async function getGenres(params: GenresQuery): Promise<{ genres: Genre[] }> {
    return tmdbService.getGenres(params);
  }

  /**
   * Internal: Fetch both trending and discover, apply scoring, and cache the result
   */
  async function fetchAndCachePopular(language: string): Promise<Media[]> {
    // Fetch 5 pages each from trending and discover
    const [trendingResult, discoverResult] = await Promise.all([
      tmdbService.fetchTrending({ language, time_window: 'week' }, [1, 2, 3, 4, 5]),
      tmdbService.fetchDiscover({ language, type: 'both', recentDays: 30 }, [1, 2, 3, 4, 5]),
    ]);

    const trendingResults = trendingResult.results;
    const discoverResults = discoverResult.results;

    // Apply custom scoring to all results
    const allResultsWithScoring = [...trendingResults, ...discoverResults].map(item => {
      const customPopularity = calculateCustomPopularity(item);
      return { ...item, custom_popularity: customPopularity };
    });

    // Remove duplicates (prefer trending version if exists)
    const uniqueResults = Array.from(
      allResultsWithScoring
        .reduce((map, item) => {
          const existing = map.get(item.id);
          if (!existing || item.trending_rank) {
            map.set(item.id, item);
          }
          return map;
        }, new Map<number, Media>())
        .values()
    );

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

    // Apply post-fetch filtering
    const filteredResults = allResults.filter(item =>
      filterByCriteria(item, {
        type,
        regions: params.regionGroups || [],
        genres: params.withGenres || [],
      })
    );

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

  return { initialize, search, popular, discover, getDetails, getGenres };
}

export type MediaService = ReturnType<typeof createMediaService>;
