import type { GenreKey, InteractionFilter, SearchType, Media } from '@findarr/shared';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiltersToolbar } from '../components/FiltersToolbar';
import { ResultsGrid } from '../components/ResultsGrid';
import { SearchBar } from '../components/SearchBar';
import { Button } from '../components/ui/Button';
import { useHistoryRestoreState } from '../hooks/useHistoryRestoreState';
import { searchService, userSettingsService } from '../services/api';
import { buildCatalogSearchParams, readCatalogSearchParams } from '../utils/catalogSearchParams';

interface PopularFeedState {
  currentPage: number;
  feedId?: string;
  results: Media[];
  totalPages: number;
}

interface PopularPageState extends PopularFeedState {
  genres: GenreKey[];
  interaction: InteractionFilter;
  query: string;
  scrollY: number;
  type: SearchType;
}

function areGenresEqual(left: GenreKey[], right: GenreKey[]) {
  return left.length === right.length && left.every((genre, index) => genre === right[index]);
}

function mergeUniqueResults(existing: Media[], incoming: Media[]) {
  const keyOf = (item: Media) => `${item.type}_${item.tmdbId}`;
  const seen = new Set(existing.map(item => keyOf(item)));
  const merged = [...existing];

  for (const item of incoming) {
    if (!seen.has(keyOf(item))) {
      merged.push(item);
      seen.add(keyOf(item));
    }
  }

  return merged;
}

export function ExplorePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearchParams = readCatalogSearchParams(searchParams, {
    interaction: 'unvoted',
  });
  const { restoredState, persistState } = useHistoryRestoreState<PopularPageState>();

  const [results, setResults] = useState<Media[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [feedId, setFeedId] = useState<string | undefined>(undefined);
  const [totalPages, setTotalPages] = useState(0);
  const [currentSearchType, setCurrentSearchType] = useState<SearchType>(initialSearchParams.type);
  const [currentQuery, setCurrentQuery] = useState(initialSearchParams.q);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [language, setLanguage] = useState<string>('de-DE');
  const [selectedGenres, setSelectedGenres] = useState<GenreKey[]>(initialSearchParams.genres);
  const [interactionFilter, setInteractionFilter] = useState<InteractionFilter>(
    initialSearchParams.interaction ?? 'unvoted'
  );
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const popularSnapshotRef = useRef<PopularPageState | null>(null);
  const hasConsumedRestoreRef = useRef(false);
  const latestRequestIdRef = useRef(0);

  const isSearchMode = currentQuery.trim().length > 0;

  // Load user settings on mount
  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        const settings = await userSettingsService.get();
        setLanguage(settings.language);
      } catch (error) {
        console.error('Failed to load user settings:', error);
        // Use defaults if load fails
      } finally {
        setSettingsLoaded(true);
      }
    };

    void loadUserSettings();
  }, []);

  // Sync state with URL params when they change (e.g., browser back/forward)
  useEffect(() => {
    const nextSearchParams = readCatalogSearchParams(searchParams, {
      interaction: 'unvoted',
    });
    const urlType = nextSearchParams.type;
    const urlGenres = nextSearchParams.genres;
    const urlInteraction = nextSearchParams.interaction ?? 'unvoted';
    const urlQuery = nextSearchParams.q;

    if (urlType !== currentSearchType) {
      setCurrentSearchType(urlType);
    }
    if (!areGenresEqual(urlGenres, selectedGenres)) {
      setSelectedGenres(urlGenres);
    }
    if (urlInteraction !== interactionFilter) {
      setInteractionFilter(urlInteraction);
    }
    if (urlQuery !== currentQuery) {
      setCurrentQuery(urlQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (!settingsLoaded) return;

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
            language,
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

          setResults(prev => mergeUniqueResults(prev, response.results));
          return;
        }

        const response = await searchService.popular({
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
          popularSnapshotRef.current = {
            type,
            genres,
            interaction,
            query: '',
            results: response.results,
            currentPage: response.page,
            totalPages: response.totalPages,
            feedId: response.feedId,
            scrollY: 0,
          };
          return;
        }

        setResults(prev => {
          const mergedResults = mergeUniqueResults(prev, response.results);
          popularSnapshotRef.current = {
            type,
            genres,
            interaction,
            query: '',
            results: mergedResults,
            currentPage: response.page,
            totalPages: response.totalPages,
            feedId: response.feedId,
            scrollY: 0,
          };
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
    [
      currentQuery,
      currentSearchType,
      interactionFilter,
      isSearchMode,
      language,
      selectedGenres,
      settingsLoaded,
    ]
  );

  const restoreVisibleFeed = useCallback((state: PopularFeedState) => {
    setResults(state.results);
    setCurrentPage(state.currentPage);
    setTotalPages(state.totalPages);
    setFeedId(state.feedId);
  }, []);

  const matchesVisibleFilters = useCallback(
    (state: Pick<PopularPageState, 'type' | 'genres' | 'interaction' | 'query'>) =>
      state.type === currentSearchType &&
      areGenresEqual(state.genres, selectedGenres) &&
      state.interaction === interactionFilter &&
      state.query === currentQuery,
    [currentQuery, currentSearchType, interactionFilter, selectedGenres]
  );

  const matchesPopularFilters = useCallback(
    (state: Pick<PopularPageState, 'type' | 'genres' | 'interaction'>) =>
      state.type === currentSearchType &&
      areGenresEqual(state.genres, selectedGenres) &&
      state.interaction === interactionFilter,
    [currentSearchType, interactionFilter, selectedGenres]
  );

  const persistHistoryState = useCallback(() => {
    if (!settingsLoaded || results.length === 0) {
      return;
    }

    persistState({
      type: currentSearchType,
      genres: selectedGenres,
      interaction: interactionFilter,
      query: currentQuery,
      results,
      currentPage,
      totalPages,
      ...(feedId ? { feedId } : {}),
      scrollY: window.scrollY,
    });
  }, [
    currentPage,
    currentQuery,
    currentSearchType,
    feedId,
    interactionFilter,
    persistState,
    results,
    selectedGenres,
    settingsLoaded,
    totalPages,
  ]);

  // Load first feed slice on initial render or when filters/settings change
  useEffect(() => {
    if (!settingsLoaded) {
      return;
    }

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
    settingsLoaded,
  ]);

  const handleTypeChange = (type: SearchType) => {
    setCurrentSearchType(type);
    setSearchParams(
      buildCatalogSearchParams({
        type,
        genres: selectedGenres,
        interaction: interactionFilter,
        q: currentQuery || undefined,
      })
    );
  };

  const handleGenreChange = (genres: GenreKey[]) => {
    setSelectedGenres(genres);
    setSearchParams(
      buildCatalogSearchParams({
        type: currentSearchType,
        genres,
        interaction: interactionFilter,
        q: currentQuery || undefined,
      })
    );
  };

  const handleInteractionFilterChange = (value: InteractionFilter) => {
    setInteractionFilter(value);
    setSearchParams(
      buildCatalogSearchParams({
        type: currentSearchType,
        genres: selectedGenres,
        interaction: value,
        q: currentQuery || undefined,
      })
    );
  };

  const handleSearch = (query: string) => {
    setCurrentQuery(query);
    setSearchParams(
      buildCatalogSearchParams({
        type: currentSearchType,
        genres: selectedGenres,
        interaction: interactionFilter,
        q: query,
      })
    );
  };

  const handleClearSearch = () => {
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
      })
    );
  };

  const handleSelectItem = (item: Media) => {
    persistHistoryState();
    void navigate(`/${item.type}/${item.tmdbId}`);
  };

  const handleUpdateItem = (updatedItem: Media) => {
    if (!isSearchMode && interactionFilter === 'unvoted') {
      const filtered = results.filter(
        item => !(item.tmdbId === updatedItem.tmdbId && item.type === updatedItem.type)
      );
      setResults(filtered);

      // Keep in-memory snapshot in sync so navigating away/back doesn't restore the voted item.
      if (popularSnapshotRef.current) {
        popularSnapshotRef.current = { ...popularSnapshotRef.current, results: filtered };
      }

      // Persist to history state so F5 doesn't restore the voted item.
      if (filtered.length > 0) {
        persistState({
          type: currentSearchType,
          genres: selectedGenres,
          interaction: interactionFilter,
          query: currentQuery,
          results: filtered,
          currentPage,
          totalPages,
          ...(feedId ? { feedId } : {}),
          scrollY: window.scrollY,
        });
      }

      return;
    }

    // Keep optimistic in-place update and preserve the existing feed ordering.
    setResults(prev =>
      prev.map(item =>
        item.tmdbId === updatedItem.tmdbId && item.type === updatedItem.type ? updatedItem : item
      )
    );
  };
  return (
    <>
      <div className="sticky top-0 z-30 border-b border-gray-700/50 bg-gray-800/90 backdrop-blur-md shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-full md:flex-1 md:w-auto">
              <SearchBar
                onSearch={handleSearch}
                onClear={handleClearSearch}
                loading={loading}
                hasSearched={isSearchMode}
                initialQuery={currentQuery}
              />
            </div>
            <FiltersToolbar
              disableWrapper
              selectedType={currentSearchType}
              onTypeChange={handleTypeChange}
              disabled={loading}
              selectedGenres={selectedGenres}
              onGenresChange={handleGenreChange}
              showInteractionFilter={!isSearchMode}
              interactionFilter={interactionFilter}
              onInteractionFilterChange={handleInteractionFilterChange}
              showFiltersButton={!isSearchMode}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-8">
        {results.length > 0 && (
          <div id="results-section">
            <div className="flex justify-between items-center gap-3 mb-6">
              <h2 className="text-xl md:text-3xl font-bold text-white">
                {isSearchMode
                  ? currentSearchType === 'movie'
                    ? 'Movies'
                    : currentSearchType === 'tv'
                      ? 'TV Shows'
                      : 'Movies & TV Shows'
                  : 'Trending & Popular'}
              </h2>
              <span className="text-gray-400 text-xs md:text-sm">
                {results.length.toLocaleString()}
                {currentPage < totalPages ? '+' : ''} results loaded
              </span>
            </div>

            <ResultsGrid
              results={results}
              onSelectItem={handleSelectItem}
              onUpdateItem={handleUpdateItem}
            />

            {currentPage < totalPages && (
              <div className="text-center mt-6 md:mt-8 pt-4 md:pt-6 pb-20 md:pb-0 border-t border-gray-700">
                <Button
                  onClick={() => {
                    if (currentPage < totalPages) {
                      void loadFeed({
                        page: currentPage + 1,
                        append: true,
                        ...(feedId ? { currentFeedId: feedId } : {}),
                      });
                    }
                  }}
                  disabled={currentPage >= totalPages || loadingMore || loading}
                >
                  {loadingMore ? 'Loading...' : 'Load more'}
                </Button>
              </div>
            )}
          </div>
        )}

        {results.length === 0 && !loading && (
          <div className="text-center p-8 md:p-16 text-gray-500">
            <div className="flex flex-col items-center gap-4">
              <svg
                className="w-12 h-12 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                />
              </svg>
              <p className="text-base md:text-lg">
                {isSearchMode ? 'No results found.' : 'Loading content...'}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
