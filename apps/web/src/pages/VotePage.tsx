import type { GenreKey } from '@findarr/shared/constants';
import type { MediaDetails, SearchType } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { FiltersToolbar } from '../components/FiltersToolbar';
import { MediaView } from '../components/MediaView';
import { SearchBar } from '../components/SearchBar';
import { Button } from '../components/ui/Button';
import { searchService, userSettingsService } from '../services/api';
import { asVoid } from '../utils/asyncHandlers';
import { buildCatalogSearchParams, readCatalogSearchParams } from '../utils/catalogSearchParams';

export function VotePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearchParams = readCatalogSearchParams(searchParams, { type: 'both' });
  const [currentMedia, setCurrentMedia] = useState<MediaDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedId, setFeedId] = useState<string | null>(null);
  const feedIdRef = useRef<string | null>(null);

  // Filter state (same as PopularPage)
  const [currentSearchType, setCurrentSearchType] = useState<SearchType>(initialSearchParams.type);
  const [selectedGenres, setSelectedGenres] = useState<GenreKey[]>(initialSearchParams.genres);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        await userSettingsService.get();
      } catch (e) {
        console.error('Failed to load user settings:', e);
      } finally {
        setSettingsLoaded(true);
      }
    };

    void loadUserSettings();
  }, []);

  useEffect(() => {
    const nextSearchParams = readCatalogSearchParams(searchParams, { type: 'both' });

    if (nextSearchParams.type !== currentSearchType) {
      setCurrentSearchType(nextSearchParams.type);
    }

    if (JSON.stringify(nextSearchParams.genres) !== JSON.stringify(selectedGenres)) {
      setSelectedGenres(nextSearchParams.genres);
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    feedIdRef.current = feedId;
  }, [feedId]);

  // Fetch next unvoted item
  const fetchNextItem = useCallback(async () => {
    if (!settingsLoaded) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await searchService.getNextUnvotedMedia({
        type: currentSearchType,
        genres: selectedGenres,
        interaction: 'unvoted',
        feedId: feedIdRef.current ?? undefined,
      });

      feedIdRef.current = response.feedId;
      setFeedId(response.feedId);

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
  }, [fetchNextItem]);

  // Reload when filters change (already handled by useCallback dependencies)
  // No need for separate effect since fetchNextItem will be recreated when dependencies change

  // Handle filter changes
  const handleTypeChange = (type: SearchType) => {
    setCurrentSearchType(type);
    feedIdRef.current = null;
    setFeedId(null);
    setIsComplete(false);
    setSearchParams(
      buildCatalogSearchParams({
        type,
        genres: selectedGenres,
      }),
    );
  };

  const handleGenreChange = (genres: GenreKey[]) => {
    setSelectedGenres(genres);
    feedIdRef.current = null;
    setFeedId(null);
    setIsComplete(false);
    setSearchParams(
      buildCatalogSearchParams({
        type: currentSearchType,
        genres,
      }),
    );
  };

  // Handle vote completion - fetch next item
  const handleVoteComplete = () => {
    void fetchNextItem();
  };

  return (
    <div className="pb-20 md:pb-8">
      <div className="sticky top-0 z-30 border-b border-gray-700/50 bg-gray-800/90 shadow-2xl backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-3 md:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-full md:w-auto md:flex-1">
              <SearchBar
                onSearch={(query) =>
                  void navigate(`/explore?${buildCatalogSearchParams({ q: query }).toString()}`)
                }
                loading={false}
              />
            </div>
            <FiltersToolbar
              disableWrapper
              selectedType={currentSearchType}
              onTypeChange={handleTypeChange}
              disabled={isLoading}
              selectedGenres={selectedGenres}
              onGenresChange={handleGenreChange}
            />
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="relative z-10 mx-auto max-w-6xl px-4 py-32 text-center text-gray-400 md:px-8">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-amber-500" />
            <p>Loading next item...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {isDefined(error) && !isLoading && (
        <div className="relative z-10 mx-auto max-w-6xl px-4 py-32 text-center md:px-8">
          <div className="flex flex-col items-center gap-4">
            <svg
              className="h-16 w-16 text-red-500"
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
            <p className="text-lg font-medium text-red-400">{error}</p>
            <Button onClick={asVoid(fetchNextItem)} className="mt-4">
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* Completion state */}
      {isComplete && !isLoading && (
        <div className="relative z-10 mx-auto max-w-6xl px-4 py-32 text-center md:px-8">
          <div className="flex flex-col items-center gap-4">
            <div className="mb-4 text-6xl">🎉</div>
            <h2 className="mb-2 text-2xl font-bold text-white">All Done!</h2>
            <p className="mb-6 text-lg text-gray-400">
              You&apos;ve voted on the top 100 items. Check back later for more!
            </p>
            <Button onClick={asVoid(async () => navigate('/explore'))}>Explore</Button>
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
