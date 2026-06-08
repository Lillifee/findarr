import type { GenreKey } from '@findarr/shared/constants';
import type { InteractionFilter } from '@findarr/shared/interaction';
import type { Media, SearchType } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { searchService } from '../services/api';
import { buildCatalogSearchParams, readCatalogSearchParams } from '../utils/catalogSearchParams';
import { useHistoryRestoreState } from './useHistoryRestoreState';

interface CatalogFeedState {
  currentPage: number;
  feedId?: string;
  results: Media[];
  totalPages: number;
}

interface CatalogPageState extends CatalogFeedState {
  genres: GenreKey[];
  interaction: InteractionFilter;
  query: string;
  scrollY: number;
  type: SearchType;
}

function areGenresEqual(left: GenreKey[], right: GenreKey[]) {
  return left.length === right.length && left.every((genre, index) => genre === right[index]);
}

const mediaKey = (item: Media) => `${item.type}_${item.tmdbId}`;

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

function createPopularSnapshot(params: {
  type: SearchType;
  genres: GenreKey[];
  interaction: InteractionFilter;
  results: Media[];
  currentPage: number;
  totalPages: number;
  feedId?: string;
}): CatalogPageState {
  return {
    ...params,
    query: '',
    scrollY: 0,
  };
}

export interface CatalogFeed {
  results: Media[];
  loading: boolean;
  loadingMore: boolean;
  currentPage: number;
  totalPages: number;
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
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearchParams = readCatalogSearchParams(searchParams, { interaction: 'unvoted' });

  const [results, setResults] = useState<Media[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [feedId, setFeedId] = useState<string | undefined>();
  const [totalPages, setTotalPages] = useState(0);
  const [currentSearchType, setCurrentSearchType] = useState<SearchType>(initialSearchParams.type);
  const [currentQuery, setCurrentQuery] = useState(initialSearchParams.q);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<GenreKey[]>(initialSearchParams.genres);
  const [interactionFilter, setInteractionFilter] = useState<InteractionFilter>(
    initialSearchParams.interaction ?? 'unvoted',
  );
  const popularSnapshotRef = useRef<CatalogPageState | null>(null);
  const hasConsumedRestoreRef = useRef(false);
  const latestRequestIdRef = useRef(0);

  const isSearchMode = currentQuery.trim().length > 0;

  useEffect(() => {
    const nextSearchParams = readCatalogSearchParams(searchParams, { interaction: 'unvoted' });
    const urlInteraction = nextSearchParams.interaction ?? 'unvoted';

    if (nextSearchParams.type !== currentSearchType) {
      setCurrentSearchType(nextSearchParams.type);
    }
    if (!areGenresEqual(nextSearchParams.genres, selectedGenres)) {
      setSelectedGenres(nextSearchParams.genres);
    }
    if (urlInteraction !== interactionFilter) {
      setInteractionFilter(urlInteraction);
    }
    if (nextSearchParams.q !== currentQuery) {
      setCurrentQuery(nextSearchParams.q);
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const loadFeed = useCallback(
    async ({
      page,
      append,
      currentFeedId,
    }: {
      page?: number;
      append: boolean;
      currentFeedId?: string;
    }) => {
      const requestId = latestRequestIdRef.current + 1;
      latestRequestIdRef.current = requestId;
      const query = currentQuery;
      const type = currentSearchType;
      const genres = selectedGenres;
      const interaction = interactionFilter;
      const searchMode = isSearchMode;

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        if (searchMode) {
          const nextPage = page ?? 1;
          const response = await searchService.searchMedia({
            query,
            page: nextPage,
            type,
          });

          if (latestRequestIdRef.current !== requestId) {
            return;
          }

          setCurrentPage(response.page);
          setTotalPages(response.totalPages);
          setFeedId(undefined);

          if (!append) {
            setResults(response.results);
            return;
          }

          setResults((prev) => mergeUniqueResults(prev, response.results));
          return;
        }

        const response = await searchService.getPopularMedia({
          type,
          genres,
          interaction,
          page,
          feedId: currentFeedId,
        });

        if (latestRequestIdRef.current !== requestId) {
          return;
        }
        setCurrentPage(response.page);
        setTotalPages(response.totalPages);
        setFeedId(response.feedId);

        if (!append) {
          setResults(response.results);
          popularSnapshotRef.current = createPopularSnapshot({
            type,
            genres,
            interaction,
            results: response.results,
            currentPage: response.page,
            totalPages: response.totalPages,
            feedId: response.feedId,
          });
          return;
        }

        setResults((prev) => {
          const mergedResults = mergeUniqueResults(prev, response.results);
          popularSnapshotRef.current = createPopularSnapshot({
            type,
            genres,
            interaction,
            results: mergedResults,
            currentPage: response.page,
            totalPages: response.totalPages,
            feedId: response.feedId,
          });
          return mergedResults;
        });
      } catch (error) {
        console.error(`Failed to load ${searchMode ? 'search' : 'popular'} results:`, error);
      } finally {
        if (latestRequestIdRef.current === requestId) {
          if (append) {
            setLoadingMore(false);
          } else {
            setLoading(false);
          }
        }
      }
    },
    [currentQuery, currentSearchType, interactionFilter, isSearchMode, selectedGenres],
  );

  const restoreVisibleFeed = useCallback((state: CatalogFeedState) => {
    setResults(state.results);
    setCurrentPage(state.currentPage);
    setTotalPages(state.totalPages);
    setFeedId(state.feedId);
  }, []);

  const matchesVisibleFilters = useCallback(
    (state: Pick<CatalogPageState, 'type' | 'genres' | 'interaction' | 'query'>) =>
      state.type === currentSearchType &&
      areGenresEqual(state.genres, selectedGenres) &&
      state.interaction === interactionFilter &&
      state.query === currentQuery,
    [currentQuery, currentSearchType, interactionFilter, selectedGenres],
  );

  const matchesPopularFilters = useCallback(
    (state: Pick<CatalogPageState, 'type' | 'genres' | 'interaction'>) =>
      state.type === currentSearchType &&
      areGenresEqual(state.genres, selectedGenres) &&
      state.interaction === interactionFilter,
    [currentSearchType, interactionFilter, selectedGenres],
  );

  const createPageState = useCallback(
    (stateResults: Media[] = results, scrollY = window.scrollY): CatalogPageState => ({
      type: currentSearchType,
      genres: selectedGenres,
      interaction: interactionFilter,
      query: currentQuery,
      results: stateResults,
      currentPage,
      totalPages,
      ...(isDefined(feedId) ? { feedId } : {}),
      scrollY,
    }),
    [
      currentPage,
      currentQuery,
      currentSearchType,
      feedId,
      interactionFilter,
      results,
      selectedGenres,
      totalPages,
    ],
  );

  const persistHistoryState = useCallback(() => {
    if (results.length === 0) {
      return;
    }

    persistState(createPageState());
  }, [createPageState, persistState, results.length]);

  useEffect(() => {
    if (!hasConsumedRestoreRef.current && restoredState && matchesVisibleFilters(restoredState)) {
      hasConsumedRestoreRef.current = true;
      restoreVisibleFeed(restoredState);
      requestAnimationFrame(() => {
        window.scrollTo({ top: restoredState.scrollY, behavior: 'auto' });
      });
      return;
    }

    hasConsumedRestoreRef.current = true;

    const popularSnapshot = popularSnapshotRef.current;
    if (!isSearchMode && popularSnapshot && matchesPopularFilters(popularSnapshot)) {
      restoreVisibleFeed(popularSnapshot);
      return;
    }

    setCurrentPage(0);
    setTotalPages(0);
    setFeedId(undefined);
    void loadFeed({ append: false });
  }, [
    isSearchMode,
    loadFeed,
    matchesPopularFilters,
    matchesVisibleFilters,
    restoreVisibleFeed,
    restoredState,
  ]);

  const onTypeChange = (type: SearchType) => {
    setCurrentSearchType(type);
    setSearchParams(
      buildCatalogSearchParams({
        type,
        genres: selectedGenres,
        interaction: interactionFilter,
        q: currentQuery || undefined,
      }),
    );
  };

  const onGenresChange = (genres: GenreKey[]) => {
    setSelectedGenres(genres);
    setSearchParams(
      buildCatalogSearchParams({
        type: currentSearchType,
        genres,
        interaction: interactionFilter,
        q: currentQuery || undefined,
      }),
    );
  };

  const onInteractionFilterChange = (value: InteractionFilter) => {
    setInteractionFilter(value);
    setSearchParams(
      buildCatalogSearchParams({
        type: currentSearchType,
        genres: selectedGenres,
        interaction: value,
        q: currentQuery || undefined,
      }),
    );
  };

  const onSearch = (query: string) => {
    setCurrentQuery(query);
    setSearchParams(
      buildCatalogSearchParams({
        type: currentSearchType,
        genres: selectedGenres,
        interaction: interactionFilter,
        q: query,
      }),
    );
  };

  const onClearSearch = () => {
    latestRequestIdRef.current += 1;
    setLoading(false);
    setLoadingMore(false);
    setCurrentQuery('');

    const popularSnapshot = popularSnapshotRef.current;
    if (popularSnapshot && matchesPopularFilters(popularSnapshot)) {
      restoreVisibleFeed(popularSnapshot);
    }

    setSearchParams(
      buildCatalogSearchParams({
        type: currentSearchType,
        genres: selectedGenres,
        interaction: interactionFilter,
      }),
    );
  };

  const loadMore = () => {
    if (currentPage < totalPages) {
      void loadFeed({
        page: currentPage + 1,
        append: true,
        ...(isDefined(feedId) ? { currentFeedId: feedId } : {}),
      });
    }
  };

  const updateItem = (updatedItem: Media) => {
    if (!isSearchMode && interactionFilter === 'unvoted') {
      const filtered = results.filter(
        (item) => !(item.tmdbId === updatedItem.tmdbId && item.type === updatedItem.type),
      );
      setResults(filtered);

      if (popularSnapshotRef.current) {
        popularSnapshotRef.current = { ...popularSnapshotRef.current, results: filtered };
      }

      if (filtered.length > 0) {
        persistState(createPageState(filtered));
      }

      return;
    }

    setResults((prev) =>
      prev.map((item) =>
        item.tmdbId === updatedItem.tmdbId && item.type === updatedItem.type ? updatedItem : item,
      ),
    );
  };

  return {
    results,
    loading,
    loadingMore,
    currentPage,
    totalPages,
    isSearchMode,
    currentSearchType,
    currentQuery,
    selectedGenres,
    interactionFilter,
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
