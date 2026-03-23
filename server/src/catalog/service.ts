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
} from '@findarr/shared';
import type { DB } from '../db/setup.js';
import { enrichWithRecords, enrichWithInteractions } from '../media/enrichment.js';
import { filterByCriteria } from '../media/filter.js';
import { scoreMediaItems, scoreMediaItemsForUser } from '../media/scoring.js';
import { getUserGenrePreferences, getUserKeywordPreferences } from '../preferences/repository.js';
import type { TMDBService } from '../tmdb/service.js';
import { getAllCatalogCache } from './repository.js';

/**
 * Catalog service - orchestrates multiple data sources and applies business logic
 */
export function createCatalogService(db: DB, tmdbService: TMDBService) {
  /**
   * Initialize all data sources
   */
  async function initialize() {
    await tmdbService.loadGenres();
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
   * Get media details with DB state and interactions
   * Returns enriched media (TMDB + DB record + interactions if available)
   * Does NOT create a database record - only fetches existing state
   */
  async function getDetails(params: DetailsQuery, userId?: number): Promise<Media> {
    // Fetch TMDB details
    const mediaItem = await tmdbService.getDetails(params);

    // Add database record if exists
    const withRecord = await enrichWithRecords(db, [mediaItem]);

    // Add interactions if user is authenticated and record exists
    const withInteractions = await enrichWithInteractions(db, withRecord, userId);

    return withInteractions[0] || mediaItem;
  }

  /**
   * Get all available genres
   * Currently delegates to TMDB
   */
  async function getGenres(params: GenresQuery): Promise<{ genres: Genre[] }> {
    return await tmdbService.getGenres(params);
  }

  /**
   * Popular media - sourced from catalog_cache (background sync)
   * Ensures a good mix of movies and TV shows on each page
   */
  async function popular(params: PopularQuery, userId?: number): Promise<DiscoverResponse> {
    const { page = 1, type = 'both' } = params;

    // Get all cached media from database
    const allResults = await getAllCatalogCache(db);

    // Filter by user criteria (type, genres, regions)
    let filteredResults = allResults.filter(item =>
      filterByCriteria(item, {
        type,
        regions: params.regionGroups || [],
        genres: params.withGenres || [],
      })
    );

    // Calculate base scores (trending, popularity, recency, rating)
    filteredResults = scoreMediaItems(filteredResults);

    // Apply user preference scoring if authenticated (BEFORE pagination)
    if (userId) {
      const [genrePreferences, keywordPreferences] = await Promise.all([
        getUserGenrePreferences(db, userId),
        getUserKeywordPreferences(db, userId),
      ]);

      if (genrePreferences.size > 0 || keywordPreferences.size > 0) {
        filteredResults = scoreMediaItemsForUser(
          filteredResults,
          genrePreferences,
          keywordPreferences
        );
      }
    }

    // Paginate AFTER scoring (so best matches appear on first pages)
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
