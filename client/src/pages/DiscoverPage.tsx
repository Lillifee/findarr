import type { RegionGroupId, GenreKey } from '@findarr/shared';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { SearchType, Media } from '../../../shared/dist/types';
import { FiltersToolbar } from '../components/FiltersToolbar';
import { ResultsGrid } from '../components/ResultsGrid';
import { SearchBar } from '../components/SearchBar';
import { useHistoryRestoreState } from '../hooks/useHistoryRestoreState';
import { useUserSettings } from '../hooks/useUserSettings';
import { searchService, userSettingsService } from '../services/api';
import { buildCatalogSearchParams, readCatalogSearchParams } from '../utils/catalogSearchParams';

interface DiscoverPageState {
  currentPage: number;
  results: Media[];
  scrollY: number;
  totalPages: number;
}

export function DiscoverPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearchParams = readCatalogSearchParams(searchParams, { page: 1, recentDays: 365 });
  const { restoredState, persistState } = useHistoryRestoreState<DiscoverPageState>();

  const [results, setResults] = useState<Media[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(initialSearchParams.page);
  const [hasMore, setHasMore] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [currentSearchType, setCurrentSearchType] = useState<SearchType>(initialSearchParams.type);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [recentDays, setRecentDays] = useState<number>(initialSearchParams.recentDays ?? 365);
  const [language, setLanguage] = useState<string>('de-DE');
  const [selectedRegions, setSelectedRegions] = useState<RegionGroupId[]>(['western']);
  const [currentQuery, setCurrentQuery] = useState<string>('');
  const [selectedGenres, setSelectedGenres] = useState<GenreKey[]>(initialSearchParams.genres);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Load user settings on mount
  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        const settings = await userSettingsService.get();
        setLanguage(settings.language);
        setSelectedRegions(settings.regions);
      } catch (error) {
        console.error('Failed to load user settings:', error);
        // Use defaults if load fails
      } finally {
        setSettingsLoaded(true);
      }
    };

    void loadUserSettings();
  }, []);

  // Persist user settings with debounce
  const { settingsVersion } = useUserSettings(
    {
      language,
      regions: selectedRegions,
    },
    { enabled: settingsLoaded }
  );

  // Sync state with URL params when they change (e.g., browser back/forward)
  useEffect(() => {
    const nextSearchParams = readCatalogSearchParams(searchParams, { recentDays: 365 });
    const urlType = nextSearchParams.type;
    const urlPage = nextSearchParams.page;
    const urlRecentDays = nextSearchParams.recentDays ?? 365;
    const urlGenres = nextSearchParams.genres;
    const urlQuery = nextSearchParams.q;

    if (urlType !== currentSearchType) {
      setCurrentSearchType(urlType);
    }
    if (urlPage !== currentPage) {
      setCurrentPage(urlPage);
    }
    if (urlRecentDays !== recentDays) {
      setRecentDays(urlRecentDays);
    }
    if (JSON.stringify(urlGenres) !== JSON.stringify(selectedGenres)) {
      setSelectedGenres(urlGenres);
    }
    if (urlQuery !== currentQuery) {
      setCurrentQuery(urlQuery);
      setHasSearched(Boolean(urlQuery));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const loadFeed = useCallback(
    async ({ page, append }: { page: number; append: boolean }) => {
      if (!settingsLoaded) return;

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const response =
          hasSearched && currentQuery
            ? await searchService.searchMedia({
                query: currentQuery,
                page,
                language,
                type: currentSearchType,
              })
            : await searchService.discoverMedia({
                page,
                type: currentSearchType,
                recentDays,
                genres: selectedGenres,
              });

        setCurrentPage(response.page ?? page);
        setTotalPages(response.totalPages);
        setHasMore((response.page ?? page) < response.totalPages);

        if (!append) {
          setResults(response.results);
          return;
        }

        setResults(prev => {
          const keyOf = (item: Media) => `${item.type}_${item.tmdbId}`;
          const seen = new Set(prev.map(item => keyOf(item)));
          const merged = [...prev];
          for (const item of response.results) {
            if (!seen.has(keyOf(item))) {
              merged.push(item);
              seen.add(keyOf(item));
            }
          }
          return merged;
        });
      } catch (error) {
        console.error('Failed to load discover results:', error);
      } finally {
        if (append) {
          setLoadingMore(false);
        } else {
          setLoading(false);
        }
      }
    },
    [
      currentQuery,
      currentSearchType,
      hasSearched,
      language,
      recentDays,
      selectedGenres,
      settingsLoaded,
    ]
  );

  const persistHistoryState = useCallback(() => {
    if (!settingsLoaded || results.length === 0) {
      return;
    }

    persistState({
      results,
      currentPage,
      totalPages,
      scrollY: window.scrollY,
    });
  }, [currentPage, persistState, results, settingsLoaded, totalPages]);

  useEffect(() => {
    if (!settingsLoaded) {
      return;
    }

    if (restoredState) {
      setResults(restoredState.results);
      setCurrentPage(restoredState.currentPage);
      setTotalPages(restoredState.totalPages);
      setHasMore(restoredState.currentPage < restoredState.totalPages);
      requestAnimationFrame(() => {
        window.scrollTo({ top: restoredState.scrollY, behavior: 'auto' });
      });
      return;
    }

    void loadFeed({ page: 1, append: false });
  }, [loadFeed, restoredState, settingsLoaded, settingsVersion]);
  const handleTimePeriodChange = async (newDays: number) => {
    setRecentDays(newDays);
    setSearchParams(
      buildCatalogSearchParams({
        type: currentSearchType,
        page: 1,
        recentDays: newDays,
        genres: selectedGenres,
        q: currentQuery || undefined,
      })
    );
  };

  const handleRegionsChange = (regions: RegionGroupId[]) => {
    setSelectedRegions(regions);
    setSearchParams(
      buildCatalogSearchParams({
        type: currentSearchType,
        page: 1,
        recentDays,
        genres: selectedGenres,
        q: currentQuery || undefined,
      })
    );
  };

  const handleTypeChange = (type: SearchType) => {
    setCurrentSearchType(type);
    setSearchParams(
      buildCatalogSearchParams({
        type,
        page: 1,
        recentDays,
        genres: selectedGenres,
        q: currentQuery || undefined,
      })
    );
  };

  const handleLanguageChange = (nextLanguage: string) => {
    setLanguage(nextLanguage);
    setSearchParams(
      buildCatalogSearchParams({
        type: currentSearchType,
        page: 1,
        recentDays,
        genres: selectedGenres,
        q: currentQuery || undefined,
      })
    );
  };

  const handleGenreChange = (genres: GenreKey[]) => {
    setSelectedGenres(genres);
    setSearchParams(
      buildCatalogSearchParams({
        type: currentSearchType,
        page: 1,
        recentDays,
        genres,
        q: currentQuery || undefined,
      })
    );
  };

  const handleBackToDiscovery = () => {
    setHasSearched(false);
    setCurrentQuery('');
    setSelectedGenres([]);
    setSearchParams(
      buildCatalogSearchParams({
        type: currentSearchType,
        page: 1,
        recentDays,
        genres: [],
      })
    );
  };

  const handleSearch = (query: string) => {
    setHasSearched(true);
    setCurrentQuery(query);
    setSearchParams(
      buildCatalogSearchParams({
        type: currentSearchType,
        page: 1,
        q: query,
        recentDays,
        genres: selectedGenres,
      })
    );
  };

  const handleSelectItem = (item: Media) => {
    persistHistoryState();
    void navigate(`/${item.type}/${item.tmdbId}`);
  };

  const handleUpdateItem = (updatedItem: Media) => {
    setResults(prev =>
      prev.map(item =>
        item.tmdbId === updatedItem.tmdbId && item.type === updatedItem.type ? updatedItem : item
      )
    );
  };
  return (
    <>
      {/* Search Bar - Full Width */}
      <div className="bg-gray-800/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-4 md:pt-6 pb-3">
          <SearchBar
            onSearch={handleSearch}
            onClear={handleBackToDiscovery}
            loading={loading}
            hasSearched={hasSearched}
            initialQuery={currentQuery}
          />
        </div>
      </div>

      <FiltersToolbar
        selectedType={currentSearchType}
        onTypeChange={handleTypeChange}
        disabled={loading}
        selectedGenres={selectedGenres}
        onGenresChange={handleGenreChange}
        language={language}
        onLanguageChange={handleLanguageChange}
        selectedRegions={selectedRegions}
        onRegionsChange={handleRegionsChange}
        showTimeRange
        timeRangeDays={recentDays}
        onTimeRangeChange={handleTimePeriodChange}
      />

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-8">
        {results.length > 0 && (
          <div id="results-section">
            <div className="flex justify-between items-center gap-3 mb-6">
              <h2 className="text-xl md:text-3xl font-bold text-white">
                {hasSearched
                  ? currentSearchType === 'movie'
                    ? 'Movies'
                    : currentSearchType === 'tv'
                      ? 'TV Shows'
                      : 'Movies & TV Shows'
                  : 'Movies & TV Shows'}
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

            {hasMore && (
              <div className="text-center mt-6 md:mt-8 pt-4 md:pt-6 pb-20 md:pb-0 border-t border-gray-700">
                <button
                  onClick={() => {
                    void loadFeed({ page: currentPage + 1, append: true });
                  }}
                  disabled={!hasMore || loadingMore || loading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-linear-to-r from-amber-600 to-orange-600 text-white hover:from-amber-700 hover:to-orange-700 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? 'Loading...' : 'Load more'}
                </button>
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
                {hasSearched ? 'No results found.' : 'Loading content...'}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
