import type { GenreKey } from '@findarr/shared/constants';
import type { InteractionFilter } from '@findarr/shared/interaction';
import type { Media, SearchType } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { searchService } from '../services/api';
import { buildCatalogSearchParams, readCatalogSearchParams } from '../utils/catalogSearchParams';
import { useHistoryRestoreState } from './useHistoryRestoreState';

interface CatalogFeedState {
  currentPage: number;
  feedId?: string;
  results: Media[];
  hasMore: boolean;
}

interface CatalogFilters {
  genres: GenreKey[];
  interaction: InteractionFilter;
  query: string;
  type: SearchType;
}

interface CatalogPageState extends CatalogFeedState, CatalogFilters {
  scrollY: number;
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
  results: [],
  hasMore: false,
};

const idleLoadingState: LoadingState = {
  loading: false,
  loadingMore: false,
};

const mediaKey = (item: Media) => `${item.type}_${item.tmdbId}`;

function areGenresEqual(left: GenreKey[], right: GenreKey[]) {
  return left.length === right.length && left.every((genre, index) => genre === right[index]);
}

function mergeUniqueResults(existing: Media[], incoming: Media[]) {
  const seen = new Set(existing.map((item) => mediaKey(item)));
  const merged = [...existing];

  for (const item of incoming) {
    if (!seen.has(mediaKey(item))) {
      merged.push(item);
      seen.add(mediaKey(item));
    }
  }

  return merged;
}

function createPopularSnapshot(filters: CatalogFilters, feed: CatalogFeedState): CatalogPageState {
  return {
    ...filters,
    ...feed,
    query: '',
    scrollY: 0,
  };
}

function isSameMedia(left: Media, right: Media) {
  return left.tmdbId === right.tmdbId && left.type === right.type;
}

function isSameFeed(left: CatalogFeedState, right: CatalogFeedState) {
  return (
    left.currentPage === right.currentPage &&
    left.feedId === right.feedId &&
    left.results === right.results &&
    left.hasMore === right.hasMore
  );
}

function useCatalogFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const urlFilters = useMemo(
    () => readCatalogSearchParams(new URLSearchParams(searchParamsKey), { interaction: 'unvoted' }),
    [searchParamsKey],
  );

  const filters = useMemo<CatalogFilters>(
    () => ({
      type: urlFilters.type,
      genres: urlFilters.genres,
      interaction: urlFilters.interaction ?? 'unvoted',
      query: urlFilters.q,
    }),
    [urlFilters],
  );

  const updateFilters = useCallback(
    (next: Partial<CatalogFilters>) => {
      const merged = { ...filters, ...next };

      setSearchParams(
        buildCatalogSearchParams({
          type: merged.type,
          genres: merged.genres,
          interaction: merged.interaction,
          q: merged.query || undefined,
        }),
      );
    },
    [filters, setSearchParams],
  );

  return { filters, updateFilters };
}

function matchesVisibleFilters(state: CatalogPageState, filters: CatalogFilters) {
  return (
    state.type === filters.type &&
    state.interaction === filters.interaction &&
    state.query === filters.query &&
    areGenresEqual(state.genres, filters.genres)
  );
}

function matchesPopularFilters(state: CatalogPageState, filters: CatalogFilters) {
  return (
    state.type === filters.type &&
    state.interaction === filters.interaction &&
    areGenresEqual(state.genres, filters.genres)
  );
}

export interface CatalogFeed {
  results: Media[];
  loading: boolean;
  loadingMore: boolean;
  currentPage: number;
  hasMore: boolean;
  isSearchMode: boolean;
  currentSearchType: SearchType;
  currentQuery: string;
  selectedGenres: GenreKey[];
  interactionFilter: InteractionFilter;
  onTypeChange: (type: SearchType) => void;
  onGenresChange: (genres: GenreKey[]) => void;
  onInteractionFilterChange: (value: InteractionFilter) => void;
  onSearch: (query: string) => void;
  onClearSearch: () => void;
  loadMore: () => void;
  updateItem: (updatedItem: Media) => void;
  persistHistoryState: () => void;
}

export function useCatalogFeed(): CatalogFeed {
  const { restoredState, persistState } = useHistoryRestoreState<CatalogPageState>();
  const { filters, updateFilters } = useCatalogFilters();
  const [feed, setFeed] = useState<CatalogFeedState>(emptyFeed);
  const [loadingState, setLoadingState] = useState<LoadingState>(idleLoadingState);
  const feedRef = useRef<CatalogFeedState>(emptyFeed);
  const popularSnapshotRef = useRef<CatalogPageState | null>(null);
  const hasConsumedRestoreRef = useRef(false);
  const latestRequestIdRef = useRef(0);

  const isSearchMode = filters.query.trim().length > 0;

  const updateFeed = useCallback((nextFeed: CatalogFeedState) => {
    feedRef.current = nextFeed;
    setFeed(nextFeed);
  }, []);

  const createPageState = useCallback(
    (nextFeed: CatalogFeedState = feedRef.current, scrollY = window.scrollY): CatalogPageState => ({
      ...filters,
      ...nextFeed,
      scrollY,
    }),
    [filters],
  );

  const persistHistoryState = useCallback(() => {
    const currentFeed = feedRef.current;

    if (currentFeed.results.length === 0) {
      return;
    }

    persistState(createPageState(currentFeed));
  }, [createPageState, persistState]);

  const restoreFeed = useCallback(
    (nextFeed: CatalogFeedState) => {
      updateFeed({
        currentPage: nextFeed.currentPage,
        ...(isDefined(nextFeed.feedId) ? { feedId: nextFeed.feedId } : {}),
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
      const requestedFilters = filters;
      const requestedSearchMode = isSearchMode;

      setLoadingState(
        append ? { loading: false, loadingMore: true } : { loading: true, loadingMore: false },
      );

      try {
        if (requestedSearchMode) {
          const response = await searchService.searchMedia({
            query: requestedFilters.query,
            page: page ?? 1,
            type: requestedFilters.type,
          });

          if (latestRequestIdRef.current !== requestId) {
            return;
          }

          const nextFeed = {
            currentPage: response.page,
            results: append
              ? mergeUniqueResults(feedRef.current.results, response.results)
              : response.results,
            hasMore: response.results.length > 0,
          };

          updateFeed(nextFeed);
          return;
        }

        const response = await searchService.getPopularMedia({
          type: requestedFilters.type,
          genres: requestedFilters.genres,
          interaction: requestedFilters.interaction,
          page,
          feedId: currentFeedId,
        });

        if (latestRequestIdRef.current !== requestId) {
          return;
        }

        const nextFeed = {
          currentPage: response.page,
          feedId: response.feedId,
          results: append
            ? mergeUniqueResults(feedRef.current.results, response.results)
            : response.results,
          hasMore: response.results.length > 0,
        };

        updateFeed(nextFeed);
        popularSnapshotRef.current = createPopularSnapshot(requestedFilters, nextFeed);
      } catch (error) {
        console.error(
          `Failed to load ${requestedSearchMode ? 'search' : 'popular'} results:`,
          error,
        );
      } finally {
        if (latestRequestIdRef.current === requestId) {
          setLoadingState(idleLoadingState);
        }
      }
    },
    [filters, isSearchMode, updateFeed],
  );

  useEffect(() => {
    if (restoredState && matchesVisibleFilters(restoredState, filters)) {
      if (!hasConsumedRestoreRef.current) {
        hasConsumedRestoreRef.current = true;
        restoreFeed(restoredState);

        if (restoredState.query.trim().length === 0) {
          popularSnapshotRef.current = createPopularSnapshot(filters, restoredState);
        }

        requestAnimationFrame(() => {
          window.scrollTo({ top: restoredState.scrollY, behavior: 'auto' });
        });
      }

      if (isSameFeed(feedRef.current, restoredState)) {
        return;
      }
    }

    hasConsumedRestoreRef.current = true;

    const popularSnapshot = popularSnapshotRef.current;
    if (!isSearchMode && popularSnapshot && matchesPopularFilters(popularSnapshot, filters)) {
      restoreFeed(popularSnapshot);
      return;
    }

    restoreFeed(emptyFeed);
    void loadFeed({ append: false });
  }, [filters, isSearchMode, loadFeed, restoreFeed, restoredState]);

  const onTypeChange = (type: SearchType) => {
    updateFilters({ type });
  };

  const onGenresChange = (genres: GenreKey[]) => {
    updateFilters({ genres });
  };

  const onInteractionFilterChange = (interaction: InteractionFilter) => {
    updateFilters({ interaction });
  };

  const onSearch = (query: string) => {
    updateFilters({ query });
  };

  const onClearSearch = () => {
    latestRequestIdRef.current += 1;
    setLoadingState(idleLoadingState);

    const popularSnapshot = popularSnapshotRef.current;
    if (popularSnapshot && matchesPopularFilters(popularSnapshot, filters)) {
      restoreFeed(popularSnapshot);
    }

    updateFilters({ query: '' });
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

  const updateItem = (updatedItem: Media) => {
    const currentFeed = feedRef.current;
    const shouldRemoveFromFeed = !isSearchMode && filters.interaction !== 'all';
    const nextFeed = {
      ...currentFeed,
      results: shouldRemoveFromFeed
        ? currentFeed.results.filter((item) => !isSameMedia(item, updatedItem))
        : currentFeed.results.map((item) => (isSameMedia(item, updatedItem) ? updatedItem : item)),
    };

    updateFeed(nextFeed);

    if (!isSearchMode && popularSnapshotRef.current) {
      popularSnapshotRef.current = {
        ...popularSnapshotRef.current,
        results: nextFeed.results,
      };
    }

    persistState(createPageState(nextFeed));
  };

  return {
    isSearchMode,
    loading: loadingState.loading,
    loadingMore: loadingState.loadingMore,
    results: feed.results,
    currentPage: feed.currentPage,
    hasMore: feed.hasMore,
    currentSearchType: filters.type,
    currentQuery: filters.query,
    selectedGenres: filters.genres,
    interactionFilter: filters.interaction,
    onTypeChange,
    onGenresChange,
    onInteractionFilterChange,
    onSearch,
    onClearSearch,
    loadMore,
    updateItem,
    persistHistoryState,
  };
}
