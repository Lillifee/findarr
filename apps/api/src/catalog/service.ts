import type {
  SearchQuery,
  DiscoverQuery,
  PopularQuery,
  DetailsQuery,
} from '@findarr/shared/catalog';
import type {
  SearchResponse,
  Media,
  DiscoverMediaResponse,
  VoteQueueResponse,
} from '@findarr/shared/media';

import type { Database } from '../db/service.js';
import { getUserInteractionMediaKeys } from '../interaction/repository.js';
import { filterByRegions, filterByInteraction, filterByMediaType } from '../media/filter.js';
import type { MediaService } from '../media/service.js';
import type { TMDBService } from '../tmdb/service.js';
import type { UserService } from '../user/service.js';
import type { AppLogger } from '../utils/logger.js';
import { createDiscoveryFeedStore, createFeedSnapshotStore } from './helper.js';
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
  const discoveryFeedStore = createDiscoveryFeedStore<Media>(
    (item) => `${item.type}:${item.tmdbId}`,
  );

  /**
   * Search for media across all sources
   * Currently delegates to TMDB
   */
  async function search(params: SearchQuery, userId: number): Promise<SearchResponse> {
    const { language } = await user.getSettings(userId);

    const [mediaResponse, people, keywords, genres] = await Promise.all([
      tmdb.searchMedia({ ...params, language }),
      tmdb.searchPeople({ ...params, language }),
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

  async function getVotingFeed(params: PopularQuery, userId: number): Promise<VoteQueueResponse> {
    const { swipeLimit } = await user.getSettings(userId);
    const { type, page } = params;
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

  async function getDiscoveryFeedPage(params: DiscoverQuery, userId: number) {
    const { feedId, page } = params;
    const { language } = await user.getSettings(userId);
    const interactionKeys = await getUserInteractionMediaKeys(db, userId);

    return discoveryFeedStore.getPage(
      feedId,
      page,
      20,
      async (sourcePage) => {
        const response = await tmdb.discoverMedia({ ...params, language, page: sourcePage });
        return response.results;
      },
      (item) => filterByInteraction(item, interactionKeys, 'unvoted'),
    );
  }

  async function getDiscoveryFeed(
    params: DiscoverQuery,
    userId: number,
  ): Promise<DiscoverMediaResponse> {
    const { page } = params;
    const feedPage = await getDiscoveryFeedPage(params, userId);
    const results = await media.enrichMediaResults(feedPage.items, userId);

    return { page, results, feedId: feedPage.id };
  }

  return {
    search,
    getMediaDetails,
    getVotingFeed,
    getDiscoveryFeed,
  };
}

export type CatalogService = ReturnType<typeof createCatalogService>;
