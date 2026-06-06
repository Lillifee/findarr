import type {
  SearchQuery,
  DiscoverQuery,
  PopularQuery,
  DetailsQuery,
  GenresQuery,
} from '@findarr/shared/catalog';
import type { AvailableMediaQuery } from '@findarr/shared/interaction';
import type {
  AvailableMediaResponse,
  SearchResponse,
  DiscoverResponse,
  PopularResponse,
  Genre,
  Media,
  SwipeNextResponse,
} from '@findarr/shared/media';

import type { Database } from '../db/service.js';
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

export interface CatalogContext {
  db: Database;
  tmdb: TMDBService;
}

/**
 * Catalog service - orchestrates multiple data sources and applies business logic
 */
export function createCatalogService(context: CatalogContext) {
  const { db, tmdb } = context;
  const popularFeedSnapshotStore = createFeedSnapshotStore<Media>();

  async function getPopularFeedSnapshot(params: PopularQuery, userId: number) {
    const { type = 'both', interaction, genres = [] } = params;

    return popularFeedSnapshotStore.getOrCreateSnapshot(params.feedId, async () => {
      const [settings, cachedCatalogMedia, interactionKeys] = await Promise.all([
        getUserSettings(db, userId),
        getAllCatalogCache(db),
        getUserInteractionMediaKeys(db, userId),
      ]);

      const { regions } = settings;

      let filteredMedia = cachedCatalogMedia.filter(
        (item) =>
          filterByCriteria(item, {
            type,
            regions,
            genres: genres ?? [],
          }) && filterByInteraction(item, interactionKeys, interaction),
      );

      filteredMedia = await enrichWithScoring(db, filteredMedia, userId);

      filteredMedia.sort(
        (a, b) =>
          (b.state?.score?.finalTrendingScore ?? 0) - (a.state?.score?.finalTrendingScore ?? 0),
      );

      return filteredMedia;
    });
  }

  /**
   * Helper: Enrich TMDB items with complete state
   * Adds scoring, media records, and optionally user interactions
   */
  async function enrichMediaResults<T extends Media>(
    items: T[],
    userId: number,
    options: { scoring?: boolean; records?: boolean; interactions?: boolean } = {},
  ): Promise<T[]> {
    let enriched = items;
    const { scoring = true, records = true, interactions = true } = options;

    // Add scores
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

  /**
   * Search for media across all sources
   * Currently delegates to TMDB
   */
  async function searchMedia(params: SearchQuery, userId: number): Promise<SearchResponse> {
    const { language } = await getUserSettings(db, userId);
    const response = await tmdb.search({ ...params, language });
    const results = await enrichMediaResults(response.results, userId);
    return { ...response, results };
  }

  /**
   * Discover media - direct TMDB passthrough for browse mode
   * Allows custom date ranges and filters without caching
   */
  async function discoverMedia(params: DiscoverQuery, userId: number): Promise<DiscoverResponse> {
    const settings = await getUserSettings(db, userId);
    const response = await tmdb.discover({ ...params, ...settings });
    const results = await enrichMediaResults(response.results, userId);
    return { ...response, results };
  }

  /**
   * Get media details with DB state and interactions
   * Returns enriched media (TMDB + DB record + interactions if available)
   * Does NOT create a database record - only fetches existing state
   */
  async function getMediaDetails(params: DetailsQuery, userId: number) {
    const { language } = await getUserSettings(db, userId);
    const mediaItem = await tmdb.details({ ...params, language });
    const [enriched] = await enrichMediaResults([mediaItem], userId);
    return enriched;
  }

  /**
   * Get all available genres
   * Currently delegates to TMDB
   */
  async function listGenres(params: GenresQuery): Promise<Genre[]> {
    return tmdb.genres(params);
  }

  /**
   * Get a small global overview of recently available media.
   */
  async function getAvailableMedia(
    params: AvailableMediaQuery,
    userId: number,
  ): Promise<AvailableMediaResponse> {
    const { type = 'both', page = 1 } = params;
    const itemsPerPage = 20;
    const offset = (page - 1) * itemsPerPage;

    const { results: dbRecords, totalCount } = await getMediaByStatusPaginated(db, ['available'], {
      type,
      offset,
      limit: itemsPerPage,
    });

    const availableMedia = await fetchTMDBDetails(tmdb, dbRecords);
    const results = await enrichWithInteractions(db, availableMedia, userId);
    const totalPages = Math.ceil(totalCount / itemsPerPage);

    return { results, page, totalPages };
  }

  /**
   * Get next unvoted media for swipe/vote feature
   */
  async function getNextUnvotedMedia(
    params: PopularQuery,
    userId: number,
  ): Promise<SwipeNextResponse> {
    const settings = await getUserSettings(db, userId);

    const [popularFeedSnapshot, interactionKeys] = await Promise.all([
      getPopularFeedSnapshot(
        {
          ...params,
          type: params.type,
          genres: params.genres,
          interaction: 'all',
        },
        userId,
      ),
      getUserInteractionMediaKeys(db, userId),
    ]);

    const swipeWindow = popularFeedSnapshot.getSnapshotPage(1, SWIPE_CANDIDATE_LIMIT);

    const unvotedItem = swipeWindow.items.find((item) =>
      filterByInteraction(item, interactionKeys, 'unvoted'),
    );

    const media =
      unvotedItem &&
      (await getMediaDetails(
        { id: unvotedItem.tmdbId, type: unvotedItem.type, language: settings.language },
        userId,
      ));

    return { media, feedId: popularFeedSnapshot.id };
  }

  /**
   * Popular media - snapshot-backed page load-more API.
   */
  async function getPopularMedia(params: PopularQuery, userId: number): Promise<PopularResponse> {
    const { page = 1, type = 'both', interaction, genres = [] } = params;

    // Get or create feed snapshot (cached for short time to allow consistent pagination)
    const popularFeedSnapshot = await getPopularFeedSnapshot(
      { ...params, type, interaction, genres },
      userId,
    );

    // Get the requested page window from the stable snapshot
    const pageWindow = popularFeedSnapshot.getSnapshotPage(page);

    // Enrich the items in the current window with full state (scores, records, interactions)
    const results = await enrichMediaResults(pageWindow.items, userId, { scoring: false });

    return {
      results,
      page: pageWindow.page,
      totalPages: pageWindow.totalPages,
      feedId: popularFeedSnapshot.id,
    };
  }

  return {
    searchMedia,
    discoverMedia,
    listGenres,
    getPopularMedia,
    getMediaDetails,
    getAvailableMedia,
    getNextUnvotedMedia,
  };
}

export type CatalogService = ReturnType<typeof createCatalogService>;
