import type {
  AvailableMediaQuery,
  AvailableMediaResponse,
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
  fetchTMDBDetails,
} from '../media/enrichment.js';
import { filterByCriteria, filterByInteraction } from '../media/filter.js';
import { getMediaByStatusPaginated } from '../media/repository.js';
import type { TMDBService } from '../tmdb/service.js';
import { getUserSettings } from '../user/service.js';
import { createFeedSnapshotStore } from './helper.js';
import { getAllCatalogCache } from './repository.js';

const SWIPE_CANDIDATE_LIMIT = 100;

/**
 * Catalog service - orchestrates multiple data sources and applies business logic
 */
export function createCatalogService(db: DB, tmdbService: TMDBService) {
  const popularFeedSnapshotStore = createFeedSnapshotStore<Media>();

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
    const response = await tmdbService.discover({ ...params, ...settings });
    const results = await enrichResults(response.results, userId);
    return { ...response, results };
  }

  /**
   * Get media details with DB state and interactions
   * Returns enriched media (TMDB + DB record + interactions if available)
   * Does NOT create a database record - only fetches existing state
   */
  async function details(params: DetailsQuery, userId: number) {
    const mediaItem = await tmdbService.details(params);
    const [enriched] = await enrichResults([mediaItem], userId);
    return (enriched || mediaItem) as MediaDetails;
  }

  /**
   * Get all available genres
   * Currently delegates to TMDB
   */
  async function genres(params: GenresQuery): Promise<{ genres: Genre[] }> {
    return await tmdbService.genres(params);
  }

  /**
   * Get a small global overview of recently available media.
   */
  async function available(
    params: AvailableMediaQuery,
    userId: number
  ): Promise<AvailableMediaResponse> {
    const { type = 'both', page = 1 } = params;
    const itemsPerPage = 20;
    const offset = (page - 1) * itemsPerPage;

    const { results: dbRecords, totalCount } = await getMediaByStatusPaginated(db, ['available'], {
      type,
      offset,
      limit: itemsPerPage,
    });

    const availableMedia = await fetchTMDBDetails(tmdbService, dbRecords);
    const results = await enrichWithInteractions(db, availableMedia, userId);
    const totalPages = Math.ceil(totalCount / itemsPerPage);

    return { results, page, totalPages };
  }

  /**
   * Get next unvoted media for swipe/vote feature
   */
  async function nextUnvoted(params: PopularQuery, userId: number): Promise<SwipeNextResponse> {
    const settings = await getUserSettings(db, userId);

    const [snapshot, interactionKeys] = await Promise.all([
      popularSnapshot(
        {
          ...params,
          type: params.type,
          genres: params.genres,
          interaction: 'all',
        },
        userId
      ),
      getUserInteractionMediaKeys(db, userId),
    ]);

    const swipeWindow = popularFeedSnapshotStore.getPage(snapshot.items, 1, SWIPE_CANDIDATE_LIMIT);

    const unvotedItem =
      swipeWindow.items.find(item => filterByInteraction(item, interactionKeys, 'unvoted')) || null;

    const media =
      unvotedItem &&
      (await details(
        { id: unvotedItem.tmdbId, type: unvotedItem.type, language: settings.language },
        userId
      ));

    return { media, feedId: snapshot.id };
  }

  /**
   * Popular media - snapshot-backed page load-more API.
   */
  async function popular(params: PopularQuery, userId: number): Promise<PopularResponse> {
    const { page = 1, type = 'both', interaction, genres = [] } = params;

    // Get or create feed snapshot (cached for short time to allow consistent pagination)
    const snapshot = await popularSnapshot({ ...params, type, interaction, genres }, userId);

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

  async function popularSnapshot(params: PopularQuery, userId: number) {
    const { type = 'both', interaction, genres = [] } = params;

    return popularFeedSnapshotStore.getOrCreate(params.feedId, async () => {
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
    search,
    popular,
    discover,
    details,
    genres,
    available,
    nextUnvoted,
  };
}

export type CatalogService = ReturnType<typeof createCatalogService>;
