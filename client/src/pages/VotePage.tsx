import type { MediaDetails, RegionGroupId, GenreKey, SearchType } from '@findarr/shared';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { GenreChips } from '../components/GenreChips';
import { MediaTypeChips } from '../components/MediaTypeChips';
import { MediaView } from '../components/MediaView';
import { RegionChips } from '../components/RegionChips';
import { useUserSettings } from '../hooks/useUserSettings';
import { searchService, userSettingsService } from '../services/api';

export function VotePage() {
  const navigate = useNavigate();
  const [currentMedia, setCurrentMedia] = useState<MediaDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter state (same as PopularPage)
  const [currentSearchType, setCurrentSearchType] = useState<SearchType>('both');
  const [language, setLanguage] = useState<string>('de-DE');
  const [selectedRegions, setSelectedRegions] = useState<RegionGroupId[]>(['western']);
  const [selectedGenres, setSelectedGenres] = useState<GenreKey[]>([]);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        const settings = await userSettingsService.get();
        setLanguage(settings.language);
        setSelectedRegions(settings.regionGroups);
        setSelectedGenres(settings.withGenres);
      } catch (error) {
        console.error('Failed to load user settings:', error);
      } finally {
        setSettingsLoaded(true);
      }
    };

    void loadUserSettings();
  }, []);

  const { settingsVersion } = useUserSettings(
    {
      language,
      regionGroups: selectedRegions,
      withGenres: selectedGenres,
    },
    { enabled: settingsLoaded }
  );

  // Fetch next unvoted item
  const fetchNextItem = useCallback(async () => {
    if (!settingsLoaded) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await searchService.getNextSwipe({
        type: currentSearchType,
      });
      if (response.media) {
        setCurrentMedia(response.media);
        setIsComplete(false);
      } else {
        setCurrentMedia(null);
        setIsComplete(true);
      }
    } catch (error_) {
      console.error('Failed to fetch next item:', error_);
      setError('Failed to load next item. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [currentSearchType, settingsLoaded]);

  // Load first item on mount
  useEffect(() => {
    void fetchNextItem();
  }, [fetchNextItem, settingsVersion]);

  // Reload when filters change (already handled by useCallback dependencies)
  // No need for separate effect since fetchNextItem will be recreated when dependencies change

  // Handle filter changes
  const handleTypeChange = (type: SearchType) => {
    setCurrentSearchType(type);
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value);
  };

  const handleRegionsChange = (regions: RegionGroupId[]) => {
    setSelectedRegions(regions);
  };

  const handleGenreChange = (genres: GenreKey[]) => {
    setSelectedGenres(genres);
  };

  // Handle vote completion - fetch next item
  const handleVoteComplete = () => {
    void fetchNextItem();
  };

  return (
    <div className="pb-20 md:pb-8">
      {/* Sticky Media Type & Filter Toggle Row - Full Width */}
      <div className="sticky top-0 z-30 bg-gray-800/90 backdrop-blur-md border-b border-gray-700/50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3">
          <div className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <MediaTypeChips
              selectedType={currentSearchType}
              onChange={handleTypeChange}
              disabled={isLoading}
            />

            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-700/80 transition-all cursor-pointer whitespace-nowrap shadow-md"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                />
              </svg>
              <span>Filters</span>
              {!filtersExpanded && (
                <span className="hidden md:inline text-xs font-normal text-gray-400">
                  (
                  {selectedGenres.length > 0 &&
                    `${selectedGenres.length} genre${selectedGenres.length === 1 ? '' : 's'}`}
                  {selectedGenres.length > 0 && selectedRegions.length > 0 && ', '}
                  {selectedRegions.length > 0 &&
                    `${selectedRegions.length} region${selectedRegions.length === 1 ? '' : 's'}`}
                  {selectedGenres.length === 0 && selectedRegions.length === 0 && 'None'})
                </span>
              )}
              <span
                className="text-sm transition-transform duration-200"
                style={{
                  transform: filtersExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              >
                ▼
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Additional Filters - Overlay */}
      {filtersExpanded && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-40 animate-in fade-in duration-200"
            onClick={() => setFiltersExpanded(false)}
          />

          {/* Filter Panel */}
          <div className="fixed top-16 left-0 right-0 md:left-64 md:right-0 z-50 mx-4 md:mx-8 max-w-7xl md:ml-auto md:mr-auto animate-in slide-in-from-top-4 duration-200">
            <div className="bg-gray-800/95 backdrop-blur-md border border-gray-700/50 rounded-lg shadow-2xl overflow-hidden">
              {/* Close Button */}
              <div className="flex justify-end p-2 border-b border-gray-700/50">
                <button
                  onClick={() => setFiltersExpanded(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white hover:bg-gray-700/60 rounded-md transition-all cursor-pointer"
                >
                  <span>Close</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="p-3 md:p-4">
                <div className="flex flex-col gap-4">
                  {/* Genres */}
                  <GenreChips
                    selectedGenres={selectedGenres}
                    onGenreChange={handleGenreChange}
                    disabled={isLoading}
                  />

                  <div className="flex flex-col gap-2 w-full">
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                        />
                      </svg>
                      <span>Language</span>
                    </label>
                    <select
                      value={language}
                      onChange={handleLanguageChange}
                      disabled={isLoading}
                      className="w-full px-3 py-3 text-base border-2 border-gray-600 rounded-lg bg-gray-800/60 backdrop-blur-sm text-white hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <option value="de-DE">German (Germany)</option>
                      <option value="en-US">English (US)</option>
                      <option value="en-GB">English (UK)</option>
                      <option value="fr-FR">French (France)</option>
                      <option value="es-ES">Spanish (Spain)</option>
                      <option value="it-IT">Italian (Italy)</option>
                      <option value="nl-NL">Dutch (Netherlands)</option>
                      <option value="pt-BR">Portuguese (Brazil)</option>
                    </select>
                  </div>

                  {/* Regions */}
                  <RegionChips
                    selectedRegions={selectedRegions}
                    onRegionsChange={handleRegionsChange}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-8 py-32 text-center text-gray-400">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
            <p>Loading next item...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-8 py-32 text-center">
          <div className="flex flex-col items-center gap-4">
            <svg
              className="w-16 h-16 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-red-400 text-lg font-medium">{error}</p>
            <button
              onClick={() => void fetchNextItem()}
              className="mt-4 px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Completion state */}
      {isComplete && !isLoading && (
        <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-8 py-32 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-white mb-2">All Done!</h2>
            <p className="text-gray-400 text-lg mb-6">
              You've voted on all top items. Check back later for more!
            </p>
            <button
              onClick={() => void navigate('/popular')}
              className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              Browse Popular
            </button>
          </div>
        </div>
      )}

      {/* Media view - only show when we have media */}
      {currentMedia && !isLoading && !isComplete && (
        <MediaView media={currentMedia} onVoteComplete={handleVoteComplete} />
      )}
    </div>
  );
}
