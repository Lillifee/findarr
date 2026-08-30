import type { GenreKey } from '@findarr/shared/constants';
import type { Media, Person, SearchType } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { searchService } from '../services/api';
import { buildCatalogSearchParams, readCatalogSearchParams } from '../utils/catalogSearchParams';
import { isSameMedia, mergeUniqueMedia } from '../utils/media';

interface CatalogFeedState {
  currentPage: number;
  feedId?: string;
  people: Person[];
  results: Media[];
  hasMore: boolean;
}

interface CatalogFilters {
  genres: GenreKey[];
  query: string;
  type: SearchType;
  personId?: number | undefined;
}

interface PopularFeedSnapshot extends CatalogFeedState {
  genres: GenreKey[];
  type: SearchType;
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
  people: [],
  results: [],
  hasMore: false,
};

const idleLoadingState: LoadingState = {
  loading: false,
  loadingMore: false,
};

function areGenresEqual(left: GenreKey[], right: GenreKey[]) {
  return left.length === right.length && left.every((genre, index) => genre === right[index]);
}

function createPopularSnapshot(
  filters: CatalogFilters,
  feed: CatalogFeedState,
): PopularFeedSnapshot {
  return {
    ...feed,
    genres: filters.genres,
    type: filters.type,
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
      genres: urlFilters.genres,
      query: urlFilters.q,
      personId: urlFilters.personId,
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
          q: merged.query || undefined,
          personId: merged.personId,
        }),
      );
    },
    [filters, setSearchParams],
  );

  return { filters, updateFilters };
}

function matchesPopularFilters(state: PopularFeedSnapshot, filters: CatalogFilters) {
  return state.type === filters.type && areGenresEqual(state.genres, filters.genres);
}

export interface CatalogFeed {
  results: Media[];
  people: Person[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  isSearchMode: boolean;
  isPerson: boolean;
  currentSearchType: SearchType;
  currentQuery: string;
  selectedGenres: GenreKey[];
  onTypeChange: (type: SearchType) => void;
  onGenresChange: (genres: GenreKey[]) => void;
  onSearch: (query: string) => void;
  onPersonSelect: (person: Person) => void;
  onClearSearch: () => void;
  loadMore: () => void;
  updateItem: (updatedItem: Media) => void;
}

export function useCatalogFeed(): CatalogFeed {
  const { filters, updateFilters } = useCatalogFilters();
  const [feed, setFeed] = useState<CatalogFeedState>(emptyFeed);
  const [loadingState, setLoadingState] = useState<LoadingState>(idleLoadingState);
  const feedRef = useRef<CatalogFeedState>(emptyFeed);
  const popularSnapshotRef = useRef<PopularFeedSnapshot | null>(null);
  const latestRequestIdRef = useRef(0);

  const isPerson = isDefined(filters.personId);
  const isSearchMode = filters.query.trim().length > 0 || isPerson;

  const updateFeed = useCallback((nextFeed: CatalogFeedState) => {
    feedRef.current = nextFeed;
    setFeed(nextFeed);
  }, []);

  const restoreFeed = useCallback(
    (nextFeed: CatalogFeedState) => {
      updateFeed({
        currentPage: nextFeed.currentPage,
        ...(isDefined(nextFeed.feedId) ? { feedId: nextFeed.feedId } : {}),
        people: nextFeed.people,
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
        if (isDefined(requestedFilters.personId)) {
          const response = await searchService.listMoviesByPerson({
            personId: requestedFilters.personId,
            page: page ?? 1,
          });

          if (latestRequestIdRef.current !== requestId) {
            return;
          }

          updateFeed({
            currentPage: response.page,
            people: [],
            results: append
              ? mergeUniqueMedia(feedRef.current.results, response.results)
              : response.results,
            hasMore: response.results.length > 0,
          });
          return;
        }

        if (requestedSearchMode) {
          const response = await searchService.search({
            query: requestedFilters.query,
            page: page ?? 1,
            type: requestedFilters.type,
          });

          if (latestRequestIdRef.current !== requestId) {
            return;
          }

          const nextFeed = {
            currentPage: response.page,
            people: append ? feedRef.current.people : response.people,
            results: append
              ? mergeUniqueMedia(feedRef.current.results, response.results)
              : response.results,
            hasMore: response.results.length > 0,
          };

          updateFeed(nextFeed);
          return;
        }

        const response = await searchService.listPopularMedia({
          type: requestedFilters.type,
          genres: requestedFilters.genres,
          page,
          feedId: currentFeedId,
        });

        if (latestRequestIdRef.current !== requestId) {
          return;
        }

        const nextFeed = {
          currentPage: response.page,
          feedId: response.feedId,
          people: [],
          results: append
            ? mergeUniqueMedia(feedRef.current.results, response.results)
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
    const popularSnapshot = popularSnapshotRef.current;
    if (!isSearchMode && popularSnapshot && matchesPopularFilters(popularSnapshot, filters)) {
      restoreFeed(popularSnapshot);
      return;
    }

    restoreFeed(emptyFeed);
    void loadFeed({ append: false });
  }, [filters, isSearchMode, loadFeed, restoreFeed]);

  const onTypeChange = (type: SearchType) => {
    updateFilters({ type, personId: undefined });
  };

  const onGenresChange = (genres: GenreKey[]) => {
    updateFilters({ genres });
  };

  const onSearch = (query: string) => {
    updateFilters({ query, personId: undefined });
  };

  const onPersonSelect = (person: Person) => {
    updateFilters({ personId: person.tmdbId, type: 'movie' });
  };

  const onClearSearch = () => {
    latestRequestIdRef.current += 1;
    setLoadingState(idleLoadingState);

    const popularSnapshot = popularSnapshotRef.current;
    if (popularSnapshot && matchesPopularFilters(popularSnapshot, filters)) {
      restoreFeed(popularSnapshot);
    }

    updateFilters({ query: '', personId: undefined });
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
    isPerson,
    loading: loadingState.loading,
    loadingMore: loadingState.loadingMore,
    results: feed.results,
    people: feed.people,
    hasMore: feed.hasMore,
    currentSearchType: filters.type,
    currentQuery: filters.query,
    selectedGenres: filters.genres,
    onTypeChange,
    onGenresChange,
    onSearch,
    onPersonSelect,
    onClearSearch,
    loadMore,
    updateItem,
  };
}
