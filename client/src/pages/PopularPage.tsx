import type { RegionGroupId, GenreKey, InteractionFilter } from '@findarr/shared';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { SearchType, Media } from '../../../shared/dist/types';
import { FiltersToolbar } from '../components/FiltersToolbar';
import { ResultsGrid } from '../components/ResultsGrid';
import { useHistoryRestoreState } from '../hooks/useHistoryRestoreState';
import { useUserSettings } from '../hooks/useUserSettings';
import { searchService, userSettingsService } from '../services/api';
import { buildCatalogSearchParams, readCatalogSearchParams } from '../utils/catalogSearchParams';

interface PopularPageState {
  currentPage: number;
  feedId?: string;
  results: Media[];
  scrollY: number;
  totalPages: number;
}

export function PopularPage() {
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
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [language, setLanguage] = useState<string>('de-DE');
  const [selectedRegions, setSelectedRegions] = useState<RegionGroupId[]>(['western']);
  const [selectedGenres, setSelectedGenres] = useState<GenreKey[]>(initialSearchParams.genres);
  const [interactionFilter, setInteractionFilter] = useState<InteractionFilter>(
    initialSearchParams.interaction ?? 'unvoted'
  );
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Load user settings on mount
  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        console.log('Loading user settings...');
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
    const nextSearchParams = readCatalogSearchParams(searchParams, {
      interaction: 'unvoted',
    });
    const urlType = nextSearchParams.type;
    const urlGenres = nextSearchParams.genres;
    const urlInteraction = nextSearchParams.interaction ?? 'unvoted';

    if (urlType !== currentSearchType) {
      setCurrentSearchType(urlType);
    }
    if (JSON.stringify(urlGenres) !== JSON.stringify(selectedGenres)) {
      setSelectedGenres(urlGenres);
    }
    if (urlInteraction !== interactionFilter) {
      setInteractionFilter(urlInteraction);
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

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await searchService.popular({
          type: currentSearchType,
          genres: selectedGenres,
          interaction: interactionFilter,
          page,
          feedId: currentFeedId,
        });

        setCurrentPage(response.page);
        setTotalPages(response.totalPages);
        setFeedId(response.feedId);

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
        console.error('Failed to load popular feed:', error);
      } finally {
        if (append) {
          setLoadingMore(false);
        } else {
          setLoading(false);
        }
      }
    },
    [currentSearchType, interactionFilter, selectedGenres, settingsLoaded]
  );

  const persistHistoryState = useCallback(() => {
    if (!settingsLoaded || results.length === 0) {
      return;
    }

    persistState({
      results,
      currentPage,
      totalPages,
      ...(feedId ? { feedId } : {}),
      scrollY: window.scrollY,
    });
  }, [currentPage, feedId, persistState, results, settingsLoaded, totalPages]);

  // Load first feed slice on initial render or when filters/settings change
  useEffect(() => {
    if (!settingsLoaded) {
      return;
    }

    if (restoredState) {
      setResults(restoredState.results);
      setCurrentPage(restoredState.currentPage);
      setTotalPages(restoredState.totalPages);
      setFeedId(restoredState.feedId);
      requestAnimationFrame(() => {
        window.scrollTo({ top: restoredState.scrollY, behavior: 'auto' });
      });
      return;
    }

    setCurrentPage(0);
    setTotalPages(0);
    setFeedId(undefined);
    void loadFeed({ append: false });
  }, [loadFeed, restoredState, settingsLoaded, settingsVersion]);

  const handleRegionsChange = (regions: RegionGroupId[]) => {
    setSelectedRegions(regions);
    setSearchParams(
      buildCatalogSearchParams({
        type: currentSearchType,
        genres: selectedGenres,
        interaction: interactionFilter,
      })
    );
  };

  const handleTypeChange = (type: SearchType) => {
    setCurrentSearchType(type);
    setSearchParams(
      buildCatalogSearchParams({
        type,
        genres: selectedGenres,
        interaction: interactionFilter,
      })
    );
  };

  const handleLanguageChange = (nextLanguage: string) => {
    setLanguage(nextLanguage);
    setSearchParams(
      buildCatalogSearchParams({
        type: currentSearchType,
        genres: selectedGenres,
        interaction: interactionFilter,
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
      })
    );
  };

  const handleSelectItem = (item: Media) => {
    persistHistoryState();
    void navigate(`/${item.type}/${item.tmdbId}`);
  };

  const handleUpdateItem = (updatedItem: Media) => {
    const hasMore = currentPage < totalPages;

    if (interactionFilter === 'unvoted') {
      setResults(prev =>
        prev.filter(item => !(item.tmdbId === updatedItem.tmdbId && item.type === updatedItem.type))
      );

      if (hasMore) {
        void loadFeed({
          page: currentPage + 1,
          append: true,
          ...(feedId ? { currentFeedId: feedId } : {}),
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
        showInteractionFilter
        interactionFilter={interactionFilter}
        onInteractionFilterChange={handleInteractionFilterChange}
      />

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-8">
        {results.length > 0 && (
          <div id="results-section">
            <div className="flex justify-between items-center gap-3 mb-6">
              <h2 className="text-xl md:text-3xl font-bold text-white">Trending & Popular</h2>
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
                <button
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
              <p className="text-base md:text-lg">Loading content...</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
