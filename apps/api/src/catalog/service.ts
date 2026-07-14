import type { SearchQuery, PopularQuery, DetailsQuery, GenresQuery } from '@findarr/shared/catalog';
import type { AvailableMediaQuery } from '@findarr/shared/interaction';
import type {
  AvailableMediaResponse,
  SearchResponse,
  PopularResponse,
  Genre,
  Media,
  SwipeNextResponse,
} from '@findarr/shared/media';

import type { Database } from '../db/service.js';
import { getUserInteractionMediaKeys } from '../interaction/repository.js';
import { filterByCriteria, filterByInteraction } from '../media/filter.js';
import { getMediaByStatusPaginated } from '../media/repository.js';
import type { MediaService } from '../media/service.js';
import type { TMDBService } from '../tmdb/service.js';
import type { UserService } from '../user/service.js';
import type { AppLogger } from '../utils/logger.js';
import { createFeedSnapshotStore } from './helper.js';
import { getAllCatalogCache } from './repository.js';

export interface CatalogContext {
  db: Database;
  tmdb: TMDBService;
  user: UserService;
  media: MediaService;
  appLog: AppLogger;
}

/**
 * Catalog service - orchestrates multiple data sources and applies business logic
 */
export function createCatalogService(context: CatalogContext) {
  const { db, tmdb, user, media } = context;
  const log = context.appLog.scope('catalog');
  const popularFeedSnapshotStore = createFeedSnapshotStore<Media>();

  async function getPopularFeedSnapshot(params: PopularQuery, userId: number) {
    const { type = 'both', interaction, genres = [] } = params;

    return popularFeedSnapshotStore.getOrCreateSnapshot(params.feedId, async () => {
      const timer = log.timer('getPopularFeedSnapshot');

      const { regions } = await user.getSettings(userId);
      const [cachedCatalogMedia, interactionKeys] = await Promise.all([
        getAllCatalogCache(db),
        getUserInteractionMediaKeys(db, userId),
      ]);

      timer.lap('catalogCache');

      let filteredMedia = cachedCatalogMedia.filter(
        (item) =>
          filterByCriteria(item, {
            type,
            regions,
            genres: genres ?? [],
          }) && filterByInteraction(item, interactionKeys, interaction),
      );

      filteredMedia = await media.enrichWithScoring(filteredMedia, userId);

      filteredMedia.sort(
        (a, b) =>
          (b.state?.score?.finalTrendingScore ?? 0) - (a.state?.score?.finalTrendingScore ?? 0),
      );
      timer.lap('scoring');
      timer.end();

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
      enriched = await media.enrichWithScoring(enriched, userId);
    }

    // Add database records (status, arrId, jellyfinId)
    if (records) {
      enriched = await media.enrichWithRecords(enriched);
    }

    // Add user interactions and vote counts
    if (interactions) {
      enriched = await media.enrichWithInteractions(enriched, userId);
    }

    return enriched;
  }

  /**
   * Search for media across all sources
   * Currently delegates to TMDB
   */
  async function searchMedia(params: SearchQuery, userId: number): Promise<SearchResponse> {
    const { language } = await user.getSettings(userId);
    const response = await tmdb.search({ ...params, language });
    const results = await enrichMediaResults(response.results, userId);
    return { ...response, results };
  }

  /**
   * Get media details with DB state and interactions
   * Returns enriched media (TMDB + DB record + interactions if available)
   * Does NOT create a database record - only fetches existing state
   */
  async function getMediaDetails(params: DetailsQuery, userId: number) {
    const { language } = await user.getSettings(userId);
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
    const limit = 10;
    const offset = (page - 1) * limit;

    const { results: dbRecords, totalCount } = await getMediaByStatusPaginated(db, ['available'], {
      type,
      offset,
      limit,
    });

    const availableMedia = await media.fetchTMDBDetails(dbRecords);
    const results = await media.enrichWithInteractions(availableMedia, userId);
    const totalPages = Math.ceil(totalCount / limit);

    return { results, page, totalPages };
  }

  /**
   * Get next unvoted media for swipe/vote feature.
   */
  async function getNextUnvotedMedia(
    params: PopularQuery,
    userId: number,
  ): Promise<SwipeNextResponse> {
    const timer = log.timer('getNextUnvotedMedia');
    const { swipeLimit } = await user.getSettings(userId);

    const [snapshot, interactionKeys] = await Promise.all([
      getPopularFeedSnapshot({ ...params, interaction: 'all' }, userId),
      getUserInteractionMediaKeys(db, userId),
    ]);
    timer.lap('snapshot');

    const votableItems = snapshot.items.slice(0, swipeLimit);
    const nextItem = votableItems.find((item) =>
      filterByInteraction(item, interactionKeys, 'unvoted'),
    );

    const nextMediaDetails =
      nextItem && (await getMediaDetails({ id: nextItem.tmdbId, type: nextItem.type }, userId));
    timer.lap('details');
    timer.end();

    return { media: nextMediaDetails, feedId: snapshot.id };
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
    listGenres,
    getPopularMedia,
    getMediaDetails,
    getAvailableMedia,
    getNextUnvotedMedia,
  };
}

export type CatalogService = ReturnType<typeof createCatalogService>;
