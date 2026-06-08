import type { GenreKey } from '@findarr/shared/constants';
import type { MediaDetails, SearchType } from '@findarr/shared/media';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { searchService, userSettingsService } from '../services/api';
import { buildCatalogSearchParams, readCatalogSearchParams } from '../utils/catalogSearchParams';

export interface VoteFeed {
  currentMedia: MediaDetails | null;
  isLoading: boolean;
  isComplete: boolean;
  error: string | null;
  currentSearchType: SearchType;
  selectedGenres: GenreKey[];
  fetchNextItem: () => Promise<void>;
  onTypeChange: (type: SearchType) => void;
  onGenresChange: (genres: GenreKey[]) => void;
}

export function useVoteFeed(): VoteFeed {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearchParams = readCatalogSearchParams(searchParams, { type: 'both' });

  const [currentMedia, setCurrentMedia] = useState<MediaDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSearchType, setCurrentSearchType] = useState<SearchType>(initialSearchParams.type);
  const [selectedGenres, setSelectedGenres] = useState<GenreKey[]>(initialSearchParams.genres);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const feedIdRef = useRef<string | null>(null);

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

  useEffect(() => {
    void fetchNextItem();
  }, [fetchNextItem]);

  const resetFeed = () => {
    feedIdRef.current = null;
    setIsComplete(false);
  };

  const onTypeChange = (type: SearchType) => {
    setCurrentSearchType(type);
    resetFeed();
    setSearchParams(buildCatalogSearchParams({ type, genres: selectedGenres }));
  };

  const onGenresChange = (genres: GenreKey[]) => {
    setSelectedGenres(genres);
    resetFeed();
    setSearchParams(buildCatalogSearchParams({ type: currentSearchType, genres }));
  };

  return {
    currentMedia,
    isLoading,
    isComplete,
    error,
    currentSearchType,
    selectedGenres,
    fetchNextItem,
    onTypeChange,
    onGenresChange,
  };
}
