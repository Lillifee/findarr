import type { GenreKey } from '@findarr/shared/constants';
import type { MediaDetails, SearchType } from '@findarr/shared/media';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { searchService } from '../services/api';
import { buildCatalogSearchParams, readCatalogSearchParams } from '../utils/catalogSearchParams';

export interface VoteFeed {
  currentMedia: MediaDetails | null;
  isLoading: boolean;
  isComplete: boolean;
  error: string | null;
  selectedType: SearchType;
  selectedGenres: GenreKey[];
  fetchNextItem: () => Promise<void>;
  onTypeChange: (type: SearchType) => void;
  onGenresChange: (genres: GenreKey[]) => void;
}

interface VoteFeedState {
  currentMedia: MediaDetails | null;
  isLoading: boolean;
  isComplete: boolean;
  error: string | null;
}

const initialFeedState: VoteFeedState = {
  currentMedia: null,
  isLoading: true,
  isComplete: false,
  error: null,
};

const createFeedState = (next: Partial<VoteFeedState>): VoteFeedState => ({
  currentMedia: null,
  isLoading: false,
  isComplete: false,
  error: null,
  ...next,
});

const areGenresEqual = (left: GenreKey[], right: GenreKey[]) =>
  left.length === right.length && left.every((genre, index) => genre === right[index]);

export function useVoteFeed(): VoteFeed {
  const [searchParams, setSearchParams] = useSearchParams();
  const { type: selectedType, genres: selectedGenres } = useMemo(
    () => readCatalogSearchParams(searchParams, { type: 'both' }),
    [searchParams],
  );

  const [feedState, setFeedState] = useState<VoteFeedState>(initialFeedState);
  const feedIdRef = useRef<string | null>(null);
  const lastFiltersRef = useRef({ genres: selectedGenres, type: selectedType });

  useEffect(() => {
    const lastFilters = lastFiltersRef.current;
    const filtersChanged =
      lastFilters.type !== selectedType || !areGenresEqual(lastFilters.genres, selectedGenres);

    if (filtersChanged) {
      lastFiltersRef.current = { genres: selectedGenres, type: selectedType };
      feedIdRef.current = null;
      setFeedState(createFeedState({}));
    }
  }, [selectedType, selectedGenres]);

  const fetchNextItem = useCallback(async () => {
    setFeedState(createFeedState({ isLoading: true }));

    try {
      const response = await searchService.getNextUnvotedMedia({
        type: selectedType,
        genres: selectedGenres,
        feedId: feedIdRef.current ?? undefined,
      });

      feedIdRef.current = response.feedId;

      if (response.media) {
        setFeedState(createFeedState({ currentMedia: response.media }));
      } else {
        setFeedState(createFeedState({ isComplete: true }));
      }
    } catch (error_) {
      console.error('Failed to fetch next item:', error_);
      setFeedState(createFeedState({ error: 'Failed to load next item. Please try again.' }));
    }
  }, [selectedType, selectedGenres]);

  useEffect(() => {
    void fetchNextItem();
  }, [fetchNextItem]);

  const onTypeChange = (type: SearchType) => {
    setSearchParams(buildCatalogSearchParams({ type, genres: selectedGenres }));
  };

  const onGenresChange = (genres: GenreKey[]) => {
    setSearchParams(buildCatalogSearchParams({ type: selectedType, genres }));
  };

  return {
    ...feedState,
    selectedType,
    selectedGenres,
    fetchNextItem,
    onTypeChange,
    onGenresChange,
  };
}
