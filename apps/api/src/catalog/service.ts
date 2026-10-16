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

  async function getPopularFeedSnapshot(feedId: string | undefined, userId: number) {
    return popularFeedSnapshotStore.getOrCreateSnapshot(feedId, async () => {
      const timer = log.timer('getPopularFeedSnapshot');

      const { regions } = await user.getSettings(userId);
      const cachedCatalogMedia = await getAllCatalogCache(db);

      timer.lap('catalogCache');

      const filteredMedia = cachedCatalogMedia.filter((item) => filterByRegions(item, regions));
      const scoredMedia = await media.enrichWithScoring(filteredMedia, userId);
      const sortedMedia = scoredMedia.toSorted(
        (a, b) =>
          (b.state?.score?.finalTrendingScore ?? 0) - (a.state?.score?.finalTrendingScore ?? 0),
      );

      timer.lap('scoring');
      timer.end();

      return sortedMedia;
    });
  }

  async function getVotingFeed(params: PopularQuery, userId: number): Promise<VoteQueueResponse> {
    const { swipeLimit } = await user.getSettings(userId);
    const { feedId, type } = params;
    const [snapshot, interactionKeys] = await Promise.all([
      getPopularFeedSnapshot(feedId, userId),
      getUserInteractionMediaKeys(db, userId),
    ]);

    const isQueueItem = (item: Media) =>
      filterByMediaType(item, type) && filterByInteraction(item, interactionKeys, 'unvoted');

    const unvotedItems = snapshot.items.slice(0, swipeLimit).filter((x) => isQueueItem(x));
    const nextPage = snapshot.getNextPage(isQueueItem, swipeLimit);

    const results = await media.enrichMediaResults(unvotedItems, userId, { scoring: false });
    const nextResults = await media.enrichMediaResults(nextPage.items, userId, { scoring: false });

    return {
      results,
      nextResults,
      feedId: snapshot.id,
      hasMore: nextPage.hasMore,
    };
  }

  async function getDiscoveryFeedPage(params: DiscoverQuery, userId: number) {
    const { feedId } = params;
    const { language } = await user.getSettings(userId);
    const interactionKeys = await getUserInteractionMediaKeys(db, userId);

    return discoveryFeedStore.getNextBatch(
      feedId,
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
    const feedPage = await getDiscoveryFeedPage(params, userId);
    const results = await media.enrichMediaResults(feedPage.items, userId);

    return { results, feedId: feedPage.id, hasMore: feedPage.hasMore };
  }

  return {
    search,
    getMediaDetails,
    getVotingFeed,
    getDiscoveryFeed,
  };
}

export type CatalogService = ReturnType<typeof createCatalogService>;
