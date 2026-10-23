import type { DiscoverQuery } from '@findarr/shared/catalog';
import type { Genre, Keyword, Media, Person, SearchType, Provider } from '@findarr/shared/media';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { searchService } from '../services/api';
import {
  addDiscoveryFilter,
  buildCatalogSearchParams,
  readCatalogSearchParams,
  type DiscoveryFilter,
} from '../utils/catalogSearchParams';
import { getDiscoveryDateRange } from '../utils/discoveryDateRanges';
import { isSameMedia, mergeUniqueMedia } from '../utils/media';

interface CatalogFeedState {
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
}

interface LoadingState {
  loading: boolean;
  loadingMore: boolean;
}

interface SuggestionState {
  keywords: Keyword[];
  people: Person[];
}

interface SearchState extends SuggestionState {
  results: Media[];
  loading: boolean;
}

interface PreferenceState extends SuggestionState {
  genres: Genre[];
  providers: Provider[];
  loading: boolean;
}

type SearchData = SearchState & { genres: Genre[]; providers: Provider[] };
type PreferenceData = PreferenceState;

export type CatalogFeedMode = 'browse' | 'discover';

const emptyFeed: CatalogFeedState = {
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

const emptySearchState: SearchState = {
  keywords: [],
  people: [],
  results: [],
  loading: false,
};

const emptyPreferencesState: PreferenceState = {
  keywords: [],
  people: [],
  genres: [],
  providers: [],
  loading: false,
};

const initialSuggestionsState: PreferenceState = {
  ...emptyPreferencesState,
  loading: true,
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
  people: Person[];
  keywords: Keyword[];
  searchResults: Media[];
  searchLoading: boolean;
  suggestions: SearchData;
  preferences: PreferenceData;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  mode: CatalogFeedMode;
  currentSearchType: SearchType;
  currentQuery: string;
  discovery: DiscoveryFilter[];
  onDiscoveryRemove: (index: number) => void;
  onDateRangeSelect: (id: number, name: string) => void;
  onProviderSelect: (provider: Provider) => void;
  onTypeChange: (type: SearchType) => void;
  onSearch: (query: string) => void;
  onSearchPreview: (query: string) => void;
  onSubmitSearch: (query: string) => void;
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
  const [searchState, setSearchState] = useState<SearchState>(emptySearchState);
  const [previewQuery, setPreviewQuery] = useState(filters.query);
  const [previewSearchState, setPreviewSearchState] = useState<SearchState>(emptySearchState);
  const [suggestions, setSuggestions] = useState<PreferenceState>(initialSuggestionsState);
  const feedRef = useRef<CatalogFeedState>(emptyFeed);
  const latestRequestIdRef = useRef(0);
  const discoveryFeedIdRef = useRef<string | null>(null);

  const feedFilters = useMemo(
    () => ({ type: filters.type, discovery: filters.discovery }),
    [filters.discovery, filters.type],
  );
  const mode: CatalogFeedMode = (feedFilters.discovery?.length ?? 0) > 0 ? 'discover' : 'browse';

  const updateFeed = useCallback((nextFeed: CatalogFeedState) => {
    feedRef.current = nextFeed;
    setFeed(nextFeed);
  }, []);

  const loadFeed = useCallback(
    async ({ append }: LoadFeedOptions) => {
      const requestId = latestRequestIdRef.current + 1;
      latestRequestIdRef.current = requestId;
      const reqFilters = feedFilters;
      const requestMode = mode;

      setLoadingState(
        append ? { loading: false, loadingMore: true } : { loading: true, loadingMore: false },
      );

      try {
        if (requestMode === 'discover') {
          const discovery = reqFilters.discovery ?? [];
          const dateFilter = discovery.find((item) => item.type === 'date');
          const dateRange = dateFilter ? getDiscoveryDateRange(dateFilter.id) : undefined;

          const discoverParams: DiscoverQuery = {
            type: reqFilters.type,
            ...(discoveryFeedIdRef.current === null ? {} : { feedId: discoveryFeedIdRef.current }),
            person: discovery.filter((item) => item.type === 'person').map((item) => item.id),
            genre: discovery.filter((item) => item.type === 'genre').map((item) => item.id),
            keyword: discovery.filter((item) => item.type === 'keyword').map((item) => item.id),
            provider: discovery.filter((item) => item.type === 'provider').map((item) => item.id),
            ...dateRange,
          };
          const response = await searchService.getDiscoveryFeed(discoverParams);

          if (latestRequestIdRef.current !== requestId) {
            return;
          }

          discoveryFeedIdRef.current = response.feedId;
          updateFeed({
            genres: [],
            people: [],
            keywords: [],
            results: append
              ? mergeUniqueMedia(feedRef.current.results, response.results)
              : response.results,
            hasMore: response.hasMore,
          });
        }
      } catch (error) {
        console.error(
          `Failed to load ${requestMode === 'discover' ? 'discovery' : 'preferences'}:`,
          error,
        );
      } finally {
        if (latestRequestIdRef.current === requestId) {
          setLoadingState(idleLoadingState);
        }
      }
    },
    [feedFilters, mode, updateFeed],
  );

  useEffect(() => {
    discoveryFeedIdRef.current = null;
    updateFeed(emptyFeed);
    void loadFeed({ append: false });
  }, [feedFilters, mode, loadFeed, updateFeed]);

  useEffect(() => {
    let active = true;
    setSuggestions((current) => ({ ...current, loading: true }));

    const loadSuggestions = async () => {
      try {
        const response = await searchService.listPreferences(
          filters.type === 'tv' ? 'tv' : 'movie',
        );
        if (active) {
          setSuggestions({
            genres: response.genres,
            people: response.people,
            keywords: response.keywords,
            providers: response.providers,
            loading: false,
          });
        }
      } catch {
        if (active) {
          setSuggestions(emptyPreferencesState);
        }
      }
    };
    void loadSuggestions();

    return () => {
      active = false;
    };
  }, [filters.type]);

  useEffect(() => {
    const query = filters.query.trim();
    let active = true;
    if (query) {
      setSearchState((current) => ({ ...current, loading: true }));
      const loadSearch = async () => {
        try {
          const response = await searchService.search({ query, page: 1, type: filters.type });
          if (active) {
            setSearchState({
              people: response.people,
              keywords: response.keywords,
              results: response.results,
              loading: false,
            });
          }
        } catch {
          if (active) {
            setSearchState({ ...emptySearchState });
          }
        }
      };
      void loadSearch();
    } else {
      setSearchState(emptySearchState);
    }

    return () => {
      active = false;
    };
  }, [filters.query, filters.type]);

  useEffect(() => {
    const query = previewQuery.trim();
    let active = true;
    if (query) {
      setPreviewSearchState((current) => ({ ...current, loading: true }));
      const loadPreview = async () => {
        try {
          const response = await searchService.search({ query, page: 1, type: filters.type });
          if (active) {
            setPreviewSearchState({
              people: response.people,
              keywords: response.keywords,
              results: response.results,
              loading: false,
            });
          }
        } catch {
          if (active) {
            setPreviewSearchState(emptySearchState);
          }
        }
      };
      void loadPreview();
    } else {
      setPreviewSearchState(emptySearchState);
    }

    return () => {
      active = false;
    };
  }, [filters.type, previewQuery]);

  const onTypeChange = (type: SearchType) => {
    const switchingBetweenMediaTypes = filters.type !== type;

    if (switchingBetweenMediaTypes) {
      setSuggestions((current) => ({ ...current, loading: true }));
    }

    updateFilters({
      type,
      ...(switchingBetweenMediaTypes ? { discovery: undefined } : {}),
    });
  };

  const onSearch = (query: string) => {
    updateFilters({ query });
  };

  const onSearchPreview = (query: string) => {
    setPreviewQuery(query);
  };

  const onSubmitSearch = (query: string) => {
    setPreviewQuery(query);
    updateFilters({ query });
  };

  const addDiscovery = (discovery: DiscoveryFilter) => {
    updateFilters({
      query: '',
      discovery: addDiscoveryFilter(filters.discovery, discovery),
    });
  };

  const onDateRangeSelect = (id: number, name: string) => {
    addDiscovery({ type: 'date', id, name });
  };

  const onProviderSelect = (provider: Provider) => {
    addDiscovery({ type: 'provider', id: provider.id, name: provider.name });
  };

  const onPersonSelect = (person: Person) => {
    addDiscovery({
      type: 'person',
      id: person.tmdbId,
      name: person.name,
    });
  };

  const onKeywordSelect = (keyword: Keyword) => {
    addDiscovery({ type: 'keyword', id: keyword.id, name: keyword.name });
  };

  const onGenreSelect = (genre: Genre) => {
    addDiscovery({ type: 'genre', id: genre.id, name: genre.name });
  };

  const onClearSearch = () => {
    setPreviewQuery('');
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

    void loadFeed({ append: true });
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
    people: searchState.people,
    keywords: searchState.keywords,
    searchResults: searchState.results,
    searchLoading: searchState.loading,
    suggestions: {
      ...(previewQuery.trim() ? previewSearchState : { ...suggestions, results: [] }),
      genres: suggestions.genres,
      providers: suggestions.providers,
    },
    preferences: { ...suggestions },
    hasMore: feed.hasMore,
    currentSearchType: filters.type,
    currentQuery: filters.query,
    discovery: filters.discovery ?? [],
    onTypeChange,
    onDateRangeSelect,
    onProviderSelect,
    onSearch,
    onSearchPreview,
    onSubmitSearch,
    onPersonSelect,
    onKeywordSelect,
    onGenreSelect,
    onClearSearch,
    onDiscoveryRemove,
    loadMore,
    updateItem,
  };
}
