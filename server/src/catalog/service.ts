import type {
  SearchQuery,
  DiscoverQuery,
  PopularQuery,
  DetailsQuery,
  GenresQuery,
  SearchResponse,
  DiscoverResponse,
  Genre,
  MediaDetails,
  Media,
} from '@findarr/shared';
import type { DB } from '../db/setup.js';
import { enrichWithRecords, enrichWithInteractions } from '../media/enrichment.js';
import { filterByCriteria, deduplicateMedia } from '../media/filter.js';
import { scoreMediaItems } from '../media/scoring.js';
import type { TMDBService } from '../tmdb/service.js';

/**
 * Catalog service - orchestrates multiple data sources and applies business logic
 */
export function createCatalogService(db: DB, tmdbService: TMDBService) {
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

    // Pre-warm popular cache
    // TODO - use setting
    await fetchAndCachePopular('de-DE');
  }

  /**
   * Search for media across all sources
   * Currently delegates to TMDB
   */
  async function search(params: SearchQuery, userId?: number): Promise<SearchResponse> {
    const response = await tmdbService.search(params);
    const results = await enrichResults(response.results, userId);
    return { ...response, results };
  }

  /**
   * Discover media - direct TMDB passthrough for browse mode
   * Allows custom date ranges and filters without caching
   */
  async function discover(params: DiscoverQuery, userId?: number): Promise<DiscoverResponse> {
    const response = await tmdbService.fetchDiscover(params);
    const results = await enrichResults(response.results, userId);
    return { ...response, results };
  }

  /**
   * Get detailed information about a media item
   * Currently delegates to TMDB
   */
  async function getDetails(params: DetailsQuery): Promise<MediaDetails> {
    return await tmdbService.getDetails(params);
  }

  /**
   * Get all available genres
   * Currently delegates to TMDB
   */
  async function getGenres(params: GenresQuery): Promise<{ genres: Genre[] }> {
    return await tmdbService.getGenres(params);
  }

  /**
   * Fetch, score, and cache popular media
   */
  async function fetchAndCachePopular(language: string): Promise<Media[]> {
    // Fetch both trending and recent releases
    const [trendingResult, discoverResult] = await Promise.all([
      tmdbService.fetchTrending({ language, time_window: 'week' }, [1, 2, 3, 4, 5, 6, 7, 8]),
      tmdbService.fetchDiscover(
        { language, type: 'both', recentDays: 365 },
        [1, 2, 3, 4, 5, 6, 7, 8]
      ),
    ]);

    const merged = [...trendingResult.results, ...discoverResult.results];

    // Dedupe and score
    const deduped = deduplicateMedia(merged);
    const scored = scoreMediaItems(deduped);

    // Cache the results
    popularCache = {
      results: scored,
      fetchedAt: new Date(),
      language,
    };

    return scored;
  }

  /**
   * Popular media - cached discover + trending with balanced scoring
   * Ensures a good mix of movies and TV shows on each page
   */
  async function popular(params: PopularQuery, userId?: number): Promise<DiscoverResponse> {
    const { page = 1, type = 'both', language = 'en-US' } = params;
    const now = new Date();

    // Get or refresh cache
    const allResults =
      popularCache &&
      popularCache.language === language &&
      now.getTime() - popularCache.fetchedAt.getTime() < CACHE_TTL
        ? popularCache.results
        : await fetchAndCachePopular(language);

    // Filter by user criteria (type, genres, regions)
    const filteredResults = allResults.filter(item =>
      filterByCriteria(item, {
        type,
        regions: params.regionGroups || [],
        genres: params.withGenres || [],
      })
    );

    // Paginate
    const ITEMS_PER_PAGE = 20;
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedResults = filteredResults.slice(startIndex, endIndex);

    // Enrich with database state
    const results = await enrichResults(paginatedResults, userId);

    return {
      results,
      page,
      totalPages: Math.ceil(filteredResults.length / ITEMS_PER_PAGE),
      totalResults: filteredResults.length,
    };
  }

  /**
   * Helper: Enrich TMDB items with database state
   * Adds media records first, then optionally user interactions
   */
  async function enrichResults(items: Media[], userId?: number): Promise<Media[]> {
    let enriched = await enrichWithRecords(db, items);
    if (userId) {
      enriched = await enrichWithInteractions(db, enriched, userId);
    }
    return enriched;
  }

  return { initialize, search, popular, discover, getDetails, getGenres };
}

export type CatalogService = ReturnType<typeof createCatalogService>;
