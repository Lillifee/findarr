import type { Genre, Keyword, Media, Person, SearchType } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { searchService } from '../services/api';
import {
  buildCatalogSearchParams,
  readCatalogSearchParams,
  type DiscoveryFilter,
} from '../utils/catalogSearchParams';
import { isSameMedia, mergeUniqueMedia } from '../utils/media';

interface CatalogFeedState {
  currentPage: number;
  feedId?: string;
  genres: Genre[];
  keywords: Keyword[];
  people: Person[];
  results: Media[];
  hasMore: boolean;
}

interface CatalogFilters {
  query: string;
  type: SearchType;
  discovery?: DiscoveryFilter | undefined;
}

interface LoadFeedOptions {
  append: boolean;
  currentFeedId?: string;
  page?: number;
}

interface LoadingState {
  loading: boolean;
  loadingMore: boolean;
}

const emptyFeed: CatalogFeedState = {
  currentPage: 0,
  genres: [],
  keywords: [],
  people: [],
  results: [],
  hasMore: false,
};

const idleLoadingState: LoadingState = {
  loading: false,
  loadingMore: false,
};

function createFilters(filters: Partial<CatalogFilters>) {
  return {
    discovery: undefined,
    ...filters,
  };
}

function createPopularSnapshot(feed: CatalogFeedState): CatalogFeedState {
  return {
    ...feed,
  };
}

function useCatalogFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const urlFilters = useMemo(
    () => readCatalogSearchParams(new URLSearchParams(searchParamsKey)),
    [searchParamsKey],
  );

  const filters = useMemo<CatalogFilters>(
    () => ({
      type: urlFilters.type,
      query: urlFilters.q,
      discovery: urlFilters.discovery,
    }),
    [urlFilters],
  );

  const updateFilters = useCallback(
    (next: Partial<CatalogFilters>) => {
      const merged = { ...filters, ...next };

      setSearchParams(
        buildCatalogSearchParams({
          type: merged.type,
          q: merged.query || undefined,
          discovery: merged.discovery,
        }),
      );
    },
    [filters, setSearchParams],
  );

  return { filters, updateFilters };
}

export interface CatalogFeed {
  results: Media[];
  genres: Genre[];
  people: Person[];
  keywords: Keyword[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  isDiscovery: boolean;
  isSearchMode: boolean;
  currentSearchType: SearchType;
  currentQuery: string;
  discoveryName?: string | undefined;
  onTypeChange: (type: SearchType) => void;
  onSearch: (query: string) => void;
  onPersonSelect: (person: Person) => void;
  onKeywordSelect: (keyword: Keyword) => void;
  onGenreSelect: (genre: Genre) => void;
  onClearSearch: () => void;
  loadMore: () => void;
  updateItem: (updatedItem: Media) => void;
}

export function useCatalogFeed(): CatalogFeed {
  const { filters, updateFilters } = useCatalogFilters();
  const [feed, setFeed] = useState<CatalogFeedState>(emptyFeed);
  const [loadingState, setLoadingState] = useState<LoadingState>(idleLoadingState);
  const feedRef = useRef<CatalogFeedState>(emptyFeed);
  const popularSnapshotRef = useRef<CatalogFeedState | null>(null);
  const latestRequestIdRef = useRef(0);

  const isDiscovery = isDefined(filters.discovery);
  const isSearchMode = filters.query.trim().length > 0 || isDiscovery;

  const updateFeed = useCallback((nextFeed: CatalogFeedState) => {
    feedRef.current = nextFeed;
    setFeed(nextFeed);
  }, []);

  const restoreFeed = useCallback(
    (nextFeed: CatalogFeedState) => {
      updateFeed({
        currentPage: nextFeed.currentPage,
        ...(isDefined(nextFeed.feedId) ? { feedId: nextFeed.feedId } : {}),
        genres: nextFeed.genres,
        people: nextFeed.people,
        keywords: nextFeed.keywords,
        results: nextFeed.results,
        hasMore: nextFeed.hasMore,
      });
    },
    [updateFeed],
  );

  const loadFeed = useCallback(
    async ({ append, currentFeedId, page }: LoadFeedOptions) => {
      const requestId = latestRequestIdRef.current + 1;
      latestRequestIdRef.current = requestId;
      const reqFilters = filters;
      const reqSearchMode = isSearchMode;

      setLoadingState(
        append ? { loading: false, loadingMore: true } : { loading: true, loadingMore: false },
      );

      try {
        if (reqSearchMode && isDiscovery) {
          const { discovery } = reqFilters;
          if (!discovery) {
            return;
          }

          const discoverParams = {
            page: page ?? 1,
            type: reqFilters.type,
            discoverType: discovery.type,
            discoverId: discovery.id,
          };
          const response = await searchService.discover(discoverParams);

          if (latestRequestIdRef.current !== requestId) {
            return;
          }

          updateFeed({
            currentPage: response.page,
            genres: [],
            people: [],
            keywords: [],
            results: append
              ? mergeUniqueMedia(feedRef.current.results, response.results)
              : response.results,
            hasMore: response.results.length > 0,
          });
          return;
        }

        if (reqSearchMode) {
          const response = await searchService.search({
            query: reqFilters.query,
            page: page ?? 1,
            type: reqFilters.type,
          });

          if (latestRequestIdRef.current !== requestId) {
            return;
          }

          const nextFeed = {
            currentPage: response.page,
            genres: append ? feedRef.current.genres : response.genres,
            people: append ? feedRef.current.people : response.people,
            keywords: append ? feedRef.current.keywords : response.keywords,
            results: append
              ? mergeUniqueMedia(feedRef.current.results, response.results)
              : response.results,
            hasMore: response.results.length > 0,
          };

          updateFeed(nextFeed);
          return;
        }

        const response = await searchService.listPopularMedia({
          type: reqFilters.type,
          page,
          feedId: currentFeedId,
        });

        if (latestRequestIdRef.current !== requestId) {
          return;
        }

        const nextFeed = {
          currentPage: response.page,
          feedId: response.feedId,
          genres: [],
          people: [],
          keywords: [],
          results: append
            ? mergeUniqueMedia(feedRef.current.results, response.results)
            : response.results,
          hasMore: response.results.length > 0,
        };

        updateFeed(nextFeed);
        popularSnapshotRef.current = createPopularSnapshot(nextFeed);
      } catch (error) {
        console.error(`Failed to load ${reqSearchMode ? 'search' : 'popular'} results:`, error);
      } finally {
        if (latestRequestIdRef.current === requestId) {
          setLoadingState(idleLoadingState);
        }
      }
    },
    [filters, isDiscovery, isSearchMode, updateFeed],
  );

  useEffect(() => {
    const popularSnapshot = popularSnapshotRef.current;
    if (!isSearchMode && popularSnapshot) {
      restoreFeed(popularSnapshot);
      return;
    }

    restoreFeed(emptyFeed);
    void loadFeed({ append: false });
  }, [filters, isSearchMode, loadFeed, restoreFeed]);

  const onTypeChange = (type: SearchType) => {
    updateFilters({ type });
  };

  const onSearch = (query: string) => {
    updateFilters(createFilters({ query }));
  };

  const onPersonSelect = (person: Person) => {
    updateFilters(
      createFilters({
        discovery: { type: 'person', id: person.tmdbId, name: person.name },
      }),
    );
  };

  const onKeywordSelect = (keyword: Keyword) => {
    updateFilters(
      createFilters({
        discovery: { type: 'keyword', id: keyword.id, name: keyword.name },
      }),
    );
  };

  const onGenreSelect = (genre: Genre) => {
    updateFilters(
      createFilters({
        discovery: { type: 'genre', id: genre.id, name: genre.name },
      }),
    );
  };

  const onClearSearch = () => {
    latestRequestIdRef.current += 1;
    setLoadingState(idleLoadingState);

    const popularSnapshot = popularSnapshotRef.current;
    if (popularSnapshot) {
      restoreFeed(popularSnapshot);
    }

    updateFilters(createFilters({ query: '' }));
  };

  const loadMore = () => {
    const currentFeed = feedRef.current;

    if (!currentFeed.hasMore) {
      return;
    }

    void loadFeed({
      append: true,
      page: currentFeed.currentPage + 1,
      ...(isDefined(currentFeed.feedId) ? { currentFeedId: currentFeed.feedId } : {}),
    });
  };

  const updateItem = useCallback(
    (updatedItem: Media) => {
      const currentFeed = feedRef.current;
      const nextFeed = {
        ...currentFeed,
        results: currentFeed.results.map((item) =>
          isSameMedia(item, updatedItem) ? updatedItem : item,
        ),
      };

      updateFeed(nextFeed);

      if (!isSearchMode && popularSnapshotRef.current) {
        popularSnapshotRef.current = {
          ...popularSnapshotRef.current,
          results: nextFeed.results,
        };
      }
    },
    [isSearchMode, updateFeed],
  );

  return {
    isSearchMode,
    isDiscovery,
    loading: loadingState.loading,
    loadingMore: loadingState.loadingMore,
    results: feed.results,
    genres: feed.genres,
    people: feed.people,
    keywords: feed.keywords,
    hasMore: feed.hasMore,
    currentSearchType: filters.type,
    currentQuery: filters.query,
    discoveryName: filters.discovery?.name,
    onTypeChange,
    onSearch,
    onPersonSelect,
    onKeywordSelect,
    onGenreSelect,
    onClearSearch,
    loadMore,
    updateItem,
  };
}
