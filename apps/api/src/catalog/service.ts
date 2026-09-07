import type {
  SearchQuery,
  DiscoverQuery,
  PopularQuery,
  DetailsQuery,
  GenresQuery,
} from '@findarr/shared/catalog';
import type {
  SearchResponse,
  Genre,
  Media,
  PaginatedMediaResponse,
  VoteQueueResponse,
} from '@findarr/shared/media';

import type { Database } from '../db/service.js';
import { getUserInteractionMediaKeys } from '../interaction/repository.js';
import { filterByRegions, filterByInteraction, filterByMediaType } from '../media/filter.js';
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
    const { interaction } = params;

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
          filterByRegions(item, regions) && filterByInteraction(item, interactionKeys, interaction),
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
   * Search for media across all sources
   * Currently delegates to TMDB
   */
  async function search(params: SearchQuery, userId: number): Promise<SearchResponse> {
    const { language } = await user.getSettings(userId);

    const [mediaResponse, people, keywords, genres] = await Promise.all([
      tmdb.searchMedia({ ...params, language }),
      params.type === 'tv' ? Promise.resolve([]) : tmdb.searchPeople({ ...params, language }),
      tmdb.searchKeywords({ ...params, language }),
      tmdb.searchGenres({ ...params, language }),
    ]);

    const results = await media.enrichMediaResults(mediaResponse.results, userId);

    return { ...mediaResponse, results, people, keywords, genres };
  }

  /**
   * Get media details with DB state and interactions
   * Returns enriched media (TMDB + DB record + interactions if available)
   * Does NOT create a database record - only fetches existing state
   */
  async function getMediaDetails(params: DetailsQuery, userId: number) {
    const { language } = await user.getSettings(userId);
    const mediaItem = await tmdb.details({ ...params, language });
    const [enriched] = await media.enrichMediaResults([mediaItem], userId);
    return enriched;
  }

  /**
   * Get all available genres
   * Currently delegates to TMDB
   */
  async function listGenres(params: GenresQuery): Promise<Genre[]> {
    return tmdb.searchGenres(params);
  }

  async function getVoteQueue(params: PopularQuery, userId: number): Promise<VoteQueueResponse> {
    const { swipeLimit } = await user.getSettings(userId);
    const { type = 'both' } = params;
    const page = params.page ?? 1;
    const [snapshot, interactionKeys] = await Promise.all([
      getPopularFeedSnapshot({ ...params, interaction: 'all' }, userId),
      getUserInteractionMediaKeys(db, userId),
    ]);

    const filterItems = (items: Media[]) =>
      items.filter(
        (item) =>
          filterByMediaType(item, type) && filterByInteraction(item, interactionKeys, 'unvoted'),
      );

    const unvotedItems = filterItems(snapshot.items.slice(0, swipeLimit));
    const unvotedNextItems = filterItems(snapshot.items.slice(swipeLimit));

    const nextStart = (page - 1) * 20;
    const nextItems = unvotedNextItems.slice(nextStart, nextStart + 20);

    const results = await media.enrichMediaResults(unvotedItems, userId, { scoring: false });
    const nextResults = await media.enrichMediaResults(nextItems, userId, { scoring: false });

    return {
      results,
      nextResults,
      feedId: snapshot.id,
      hasMore: nextStart + nextItems.length < unvotedNextItems.length,
    };
  }

  async function listDiscoveredMedia(
    params: DiscoverQuery,
    userId: number,
  ): Promise<PaginatedMediaResponse> {
    const { language } = await user.getSettings(userId);

    const response = await tmdb.discoverMedia({ ...params, language });
    const results = await media.enrichMediaResults(response.results, userId);

    return { ...response, results };
  }

  return {
    search,
    listGenres,
    getMediaDetails,
    getVoteQueue,
    listDiscoveredMedia,
  };
}

export type CatalogService = ReturnType<typeof createCatalogService>;
