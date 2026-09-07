import type { DiscoverQuery } from '@findarr/shared/catalog';
import type { Genre, Keyword, Media, Person, SearchType } from '@findarr/shared/media';
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
  genres: Genre[];
  keywords: Keyword[];
  people: Person[];
  results: Media[];
  hasMore: boolean;
}

interface CatalogFilters {
  query: string;
  type: SearchType;
  discovery?: DiscoveryFilter[] | undefined;
}

interface LoadFeedOptions {
  append: boolean;
  page?: number;
}

interface LoadingState {
  loading: boolean;
  loadingMore: boolean;
}

export type CatalogFeedMode = 'browse' | 'search' | 'discover';

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

function useCatalogFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const urlFilters = useMemo(
    () => readCatalogSearchParams(new URLSearchParams(searchParamsKey), { type: 'movie' }),
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
  mode: CatalogFeedMode;
  currentSearchType: SearchType;
  currentQuery: string;
  discovery: DiscoveryFilter[];
  onDiscoveryRemove: (index: number) => void;
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
  const latestRequestIdRef = useRef(0);

  const mode: CatalogFeedMode =
    filters.query.trim().length > 0
      ? 'search'
      : (filters.discovery?.length ?? 0) > 0
        ? 'discover'
        : 'browse';

  const updateFeed = useCallback((nextFeed: CatalogFeedState) => {
    feedRef.current = nextFeed;
    setFeed(nextFeed);
  }, []);

  const loadFeed = useCallback(
    async ({ append, page }: LoadFeedOptions) => {
      const requestId = latestRequestIdRef.current + 1;
      latestRequestIdRef.current = requestId;
      const reqFilters = filters;
      const requestMode = mode;

      setLoadingState(
        append ? { loading: false, loadingMore: true } : { loading: true, loadingMore: false },
      );

      try {
        if (requestMode === 'discover') {
          const { discovery } = reqFilters;
          if (!discovery) {
            return;
          }

          const discoverParams: DiscoverQuery = {
            page: page ?? 1,
            type: reqFilters.type,
            person: discovery.filter((item) => item.type === 'person').map((item) => item.id),
            genre: discovery.filter((item) => item.type === 'genre').map((item) => item.id),
            keyword: discovery.filter((item) => item.type === 'keyword').map((item) => item.id),
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

        if (requestMode === 'search') {
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

        const response = await searchService.listPreferences(reqFilters.type);

        if (latestRequestIdRef.current !== requestId) {
          return;
        }

        updateFeed({
          currentPage: 0,
          genres: response.genres,
          people: response.people,
          keywords: response.keywords,
          results: [],
          hasMore: false,
        });
      } catch (error) {
        console.error(
          `Failed to load ${requestMode === 'search' ? 'search' : 'preferences'}:`,
          error,
        );
      } finally {
        if (latestRequestIdRef.current === requestId) {
          setLoadingState(idleLoadingState);
        }
      }
    },
    [filters, mode, updateFeed],
  );

  useEffect(() => {
    updateFeed(emptyFeed);
    void loadFeed({ append: false });
  }, [filters, mode, loadFeed, updateFeed]);

  const onTypeChange = (type: SearchType) => {
    const switchingBetweenMediaTypes = filters.type !== type;

    updateFilters({
      type,
      ...(switchingBetweenMediaTypes ? { discovery: undefined } : {}),
    });
  };

  const onSearch = (query: string) => {
    updateFilters({ query, discovery: undefined });
  };

  const onPersonSelect = (person: Person) => {
    updateFilters({
      query: '',
      discovery: [
        ...(filters.discovery ?? []),
        {
          type: 'person',
          id: person.tmdbId,
          name: person.name,
        },
      ],
    });
  };

  const onKeywordSelect = (keyword: Keyword) => {
    updateFilters({
      query: '',
      discovery: [
        ...(filters.discovery ?? []),
        { type: 'keyword', id: keyword.id, name: keyword.name },
      ],
    });
  };

  const onGenreSelect = (genre: Genre) => {
    updateFilters({
      query: '',
      discovery: [...(filters.discovery ?? []), { type: 'genre', id: genre.id, name: genre.name }],
    });
  };

  const onClearSearch = () => {
    latestRequestIdRef.current += 1;
    setLoadingState(idleLoadingState);

    updateFilters({ query: '', discovery: undefined });
  };

  const onDiscoveryRemove = (index: number) => {
    updateFilters({ discovery: filters.discovery?.filter((_, itemIndex) => itemIndex !== index) });
  };

  const loadMore = () => {
    const currentFeed = feedRef.current;

    if (!currentFeed.hasMore) {
      return;
    }

    void loadFeed({
      append: true,
      page: currentFeed.currentPage + 1,
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
    },
    [updateFeed],
  );

  return {
    mode,
    loading: loadingState.loading,
    loadingMore: loadingState.loadingMore,
    results: feed.results,
    genres: feed.genres,
    people: feed.people,
    keywords: feed.keywords,
    hasMore: feed.hasMore,
    currentSearchType: filters.type,
    currentQuery: filters.query,
    discovery: filters.discovery ?? [],
    onTypeChange,
    onSearch,
    onPersonSelect,
    onKeywordSelect,
    onGenreSelect,
    onClearSearch,
    onDiscoveryRemove,
    loadMore,
    updateItem,
  };
}
