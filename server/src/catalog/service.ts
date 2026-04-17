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
  SwipeNextResponse,
  MediaDetails,
} from '@findarr/shared';
import type { DB } from '../db/setup.js';
import {
  enrichWithRecords,
  enrichWithInteractions,
  enrichWithScoring,
} from '../media/enrichment.js';
import { filterByCriteria } from '../media/filter.js';
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

    // Enrich with scoring, DB record, and interactions
    const enriched = await enrichResults([mediaItem], userId);
    return enriched[0] || mediaItem;
  }

  /**
   * Get all available genres
   * Currently delegates to TMDB
   */
  async function getGenres(params: GenresQuery): Promise<{ genres: Genre[] }> {
    return await tmdbService.getGenres(params);
  }

  /**
   * Get next unvoted media for swipe/vote feature
   * Returns the first unvoted item from popular media with full details
   * Fetches pages sequentially until an unvoted item is found
   * Respects same filters as popular page (type, genres, regions)
   */
  async function getNextUnvoted(params: PopularQuery, userId?: number): Promise<SwipeNextResponse> {
    // Check up to 3 pages (60 items) to find an unvoted item
    const MAX_PAGES = 3;

    for (let page = 1; page <= MAX_PAGES; page++) {
      const popularPage = await popular({ ...params, page }, userId);
      const unvotedItem = popularPage.results.find(
        item => !item.state?.interactions || item.state.interactions.length === 0
      );

      if (unvotedItem) {
        // Get full details for the unvoted item
        const details = (await getDetails(
          { id: unvotedItem.tmdbId, type: unvotedItem.type, language: params.language },
          userId
        )) as MediaDetails;

        return { media: details };
      }
    }

    // No unvoted items found in first 60 items
    return { media: null };
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

    // Score items (BEFORE pagination to ensure best matches on first pages)
    filteredResults = await enrichResults(filteredResults, userId, {
      scoring: true,
      records: false,
      interactions: false,
    });

    // Sort by trending-boosted score (includes trending bonus for popular items)
    filteredResults.sort(
      (a, b) =>
        (b.state?.score?.finalTrendingScore || 0) - (a.state?.score?.finalTrendingScore || 0)
    );

    // Paginate AFTER scoring (so best matches appear on first pages)
    const ITEMS_PER_PAGE = 20;
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedResults = filteredResults.slice(startIndex, endIndex);

    // Add database state (records and interactions)
    const results = await enrichResults(paginatedResults, userId, { scoring: false }); // Skip scoring (already done)

    return {
      results,
      page,
      totalPages: Math.ceil(filteredResults.length / ITEMS_PER_PAGE),
      totalResults: filteredResults.length,
    };
  }

  /**
   * Helper: Enrich TMDB items with complete state
   * Adds scoring, media records, and optionally user interactions
   */
  async function enrichResults(
    items: Media[],
    userId?: number,
    options: { scoring?: boolean; records?: boolean; interactions?: boolean } = {}
  ): Promise<Media[]> {
    let enriched = items;
    const { scoring = true, records = true, interactions = true } = options;

    // Add scores (base + user preferences if authenticated)
    if (scoring) {
      enriched = await enrichWithScoring(db, enriched, userId);
    }

    // Add database records (status, arrId, jellyfinId)
    if (records) {
      enriched = await enrichWithRecords(db, enriched);
    }

    // Add user interactions and vote counts
    if (interactions && userId) {
      enriched = await enrichWithInteractions(db, enriched, userId);
    }

    return enriched;
  }

  return { initialize, search, popular, discover, getDetails, getGenres, getNextUnvoted };
}

export type CatalogService = ReturnType<typeof createCatalogService>;
