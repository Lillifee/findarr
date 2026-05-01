import type {
  SearchQuery,
  DiscoverQuery,
  PopularQuery,
  DetailsQuery,
  GenresQuery,
  SearchResponse,
  DiscoverResponse,
  PopularResponse,
  Genre,
  Media,
  SwipeNextResponse,
  MediaDetails,
} from '@findarr/shared';
import type { DB } from '../db/setup.js';
import { getUserInteractionMediaKeys } from '../interaction/repository.js';
import {
  enrichWithRecords,
  enrichWithInteractions,
  enrichWithScoring,
} from '../media/enrichment.js';
import { filterByCriteria, filterByInteraction } from '../media/filter.js';
import { getUserSettings } from '../settings/service.js';
import type { TMDBService } from '../tmdb/service.js';
import { createFeedSnapshotStore } from './helper.js';
import { getAllCatalogCache } from './repository.js';

/**
 * Catalog service - orchestrates multiple data sources and applies business logic
 */
export function createCatalogService(db: DB, tmdbService: TMDBService) {
  const popularFeedSnapshotStore = createFeedSnapshotStore<Media>();

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
  async function search(params: SearchQuery, userId: number): Promise<SearchResponse> {
    const response = await tmdbService.search(params);
    const results = await enrichResults(response.results, userId);
    return { ...response, results };
  }

  /**
   * Discover media - direct TMDB passthrough for browse mode
   * Allows custom date ranges and filters without caching
   */
  async function discover(params: DiscoverQuery, userId: number): Promise<DiscoverResponse> {
    const settings = await getUserSettings(db, userId);
    const response = await tmdbService.fetchDiscover({ ...params, ...settings });
    const results = await enrichResults(response.results, userId);
    return { ...response, results };
  }

  /**
   * Get media details with DB state and interactions
   * Returns enriched media (TMDB + DB record + interactions if available)
   * Does NOT create a database record - only fetches existing state
   */
  async function getDetails(params: DetailsQuery, userId: number) {
    const mediaItem = await tmdbService.getDetails(params);
    const [enriched] = await enrichResults([mediaItem], userId);
    return (enriched || mediaItem) as MediaDetails;
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
  async function getNextUnvoted(params: PopularQuery, userId: number): Promise<SwipeNextResponse> {
    const settings = await getUserSettings(db, userId);

    const popularResponse = await popular(
      {
        type: params.type,
        genres: params.genres,
        interaction: 'unvoted',
      },
      userId
    );

    const unvotedItem = popularResponse.results[0] || null;

    const media =
      unvotedItem &&
      (await getDetails(
        { id: unvotedItem.tmdbId, type: unvotedItem.type, language: settings.language },
        userId
      ));

    return { media };
  }

  /**
   * Popular media - snapshot-backed page load-more API.
   */
  async function popular(params: PopularQuery, userId: number): Promise<PopularResponse> {
    const { page = 1, type = 'both', interaction, genres = [] } = params;

    // Get or create feed snapshot (cached for short time to allow consistent pagination)
    const snapshot = await popularFeedSnapshotStore.getOrCreate(params.feedId, async () => {
      const [settings, allResults, interactionKeys] = await Promise.all([
        getUserSettings(db, userId),
        getAllCatalogCache(db),
        getUserInteractionMediaKeys(db, userId),
      ]);

      const { regions = [] } = settings;

      let filtered = allResults.filter(
        item =>
          filterByCriteria(item, { type, regions, genres }) &&
          filterByInteraction(item, interactionKeys, interaction)
      );

      filtered = await enrichWithScoring(db, filtered, userId);

      filtered.sort(
        (a, b) =>
          (b.state?.score?.finalTrendingScore || 0) - (a.state?.score?.finalTrendingScore || 0)
      );

      return filtered;
    });

    // Get the requested page window from the stable snapshot
    const window = popularFeedSnapshotStore.getPage(snapshot.items, page);

    // Enrich the items in the current window with full state (scores, records, interactions)
    const results = await enrichResults(window.items, userId, { scoring: false });

    return {
      results,
      page: window.page,
      totalPages: window.totalPages,
      feedId: snapshot.id,
    };
  }

  /**
   * Helper: Enrich TMDB items with complete state
   * Adds scoring, media records, and optionally user interactions
   */
  async function enrichResults(
    items: Media[],
    userId: number,
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
    if (interactions) {
      enriched = await enrichWithInteractions(db, enriched, userId);
    }

    return enriched;
  }

  return {
    initialize,
    search,
    popular,
    discover,
    getDetails,
    getGenres,
    getNextUnvoted,
  };
}

export type CatalogService = ReturnType<typeof createCatalogService>;
