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
  fetchNextItem: () => Promise<void>;
  onTypeChange: (type: SearchType) => void;
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

export function useVoteFeed(): VoteFeed {
  const [searchParams, setSearchParams] = useSearchParams();
  const { type: selectedType } = useMemo(
    () => readCatalogSearchParams(searchParams, { type: 'both' }),
    [searchParams],
  );

  const [feedState, setFeedState] = useState<VoteFeedState>(initialFeedState);
  const feedIdRef = useRef<string | null>(null);
  // Signature of the filters we last kicked off a fetch for. Guards against
  // duplicate initial fetches (e.g. React StrictMode double-invoking the effect)
  // while still refetching whenever the filters actually change.
  const lastFetchSignatureRef = useRef<string | null>(null);

  const fetchNextItem = useCallback(async () => {
    setFeedState(createFeedState({ isLoading: true }));

    try {
      const response = await searchService.getNextUnvotedMedia({
        type: selectedType,
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
  }, [selectedType]);

  useEffect(() => {
    const signature = selectedType;
    if (lastFetchSignatureRef.current === signature) {
      return;
    }

    // New filter combination → start a fresh snapshot and load its first item.
    lastFetchSignatureRef.current = signature;
    feedIdRef.current = null;
    void fetchNextItem();
  }, [selectedType, fetchNextItem]);

  const onTypeChange = (type: SearchType) => {
    setSearchParams(buildCatalogSearchParams({ type }));
  };

  return {
    ...feedState,
    selectedType,
    fetchNextItem,
    onTypeChange,
  };
}
