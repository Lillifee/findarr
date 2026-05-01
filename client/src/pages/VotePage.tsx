import type { MediaDetails, RegionGroupId, GenreKey, SearchType } from '@findarr/shared';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiltersToolbar } from '../components/FiltersToolbar';
import { MediaView } from '../components/MediaView';
import { useUserSettings } from '../hooks/useUserSettings';
import { searchService, userSettingsService } from '../services/api';
import { buildCatalogSearchParams, readCatalogSearchParams } from '../utils/catalogSearchParams';

export function VotePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearchParams = readCatalogSearchParams(searchParams, { type: 'both' });
  const [currentMedia, setCurrentMedia] = useState<MediaDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter state (same as PopularPage)
  const [currentSearchType, setCurrentSearchType] = useState<SearchType>(initialSearchParams.type);
  const [language, setLanguage] = useState<string>('de-DE');
  const [selectedRegions, setSelectedRegions] = useState<RegionGroupId[]>(['western']);
  const [selectedGenres, setSelectedGenres] = useState<GenreKey[]>(initialSearchParams.genres);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        const settings = await userSettingsService.get();
        setLanguage(settings.language);
        setSelectedRegions(settings.regions);
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
      regions: selectedRegions,
    },
    { enabled: settingsLoaded }
  );

  useEffect(() => {
    const nextSearchParams = readCatalogSearchParams(searchParams, { type: 'both' });

    if (nextSearchParams.type !== currentSearchType) {
      setCurrentSearchType(nextSearchParams.type);
    }

    if (JSON.stringify(nextSearchParams.genres) !== JSON.stringify(selectedGenres)) {
      setSelectedGenres(nextSearchParams.genres);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
        genres: selectedGenres,
        interaction: 'unvoted',
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
  }, [currentSearchType, selectedGenres, settingsLoaded]);

  // Load first item on mount
  useEffect(() => {
    void fetchNextItem();
  }, [fetchNextItem, settingsVersion]);

  // Reload when filters change (already handled by useCallback dependencies)
  // No need for separate effect since fetchNextItem will be recreated when dependencies change

  // Handle filter changes
  const handleTypeChange = (type: SearchType) => {
    setCurrentSearchType(type);
    setSearchParams(
      buildCatalogSearchParams({
        type,
        genres: selectedGenres,
      })
    );
  };

  const handleLanguageChange = (nextLanguage: string) => {
    setLanguage(nextLanguage);
  };

  const handleRegionsChange = (regions: RegionGroupId[]) => {
    setSelectedRegions(regions);
  };

  const handleGenreChange = (genres: GenreKey[]) => {
    setSelectedGenres(genres);
    setSearchParams(
      buildCatalogSearchParams({
        type: currentSearchType,
        genres,
      })
    );
  };

  // Handle vote completion - fetch next item
  const handleVoteComplete = () => {
    void fetchNextItem();
  };

  return (
    <div className="pb-20 md:pb-8">
      <FiltersToolbar
        selectedType={currentSearchType}
        onTypeChange={handleTypeChange}
        disabled={isLoading}
        selectedGenres={selectedGenres}
        onGenresChange={handleGenreChange}
        language={language}
        onLanguageChange={handleLanguageChange}
        selectedRegions={selectedRegions}
        onRegionsChange={handleRegionsChange}
      />

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
              You've voted on the top 100 items. Check back later for more!
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
