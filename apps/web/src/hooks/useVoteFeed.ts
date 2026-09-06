import type { Media, MediaDetails, SearchType } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { searchService } from '../services/api';
import { readCatalogSearchParams } from '../utils/catalogSearchParams';

export interface VoteFeed {
  currentMedia: MediaDetails | null;
  isLoading: boolean;
  isComplete: boolean;
  error: string | null;
  selectedType: SearchType;
  fetchNextItem: () => Promise<void>;
  onTypeChange: (type: SearchType) => void;
  results: Media[];
  nextResults: Media[];
  queueIsLoading: boolean;
  queueIsComplete: boolean;
  queueError: string | null;
  queueHasMore: boolean;
  updateItem: (item: Media) => void;
  retryQueue: () => Promise<void>;
  loadMore: () => Promise<void>;
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
  const queueFeedIdRef = useRef<string | null>(null);
  const queueRequestIdRef = useRef(0);
  const [results, setResults] = useState<Media[]>([]);
  const [nextResults, setNextResults] = useState<Media[]>([]);
  const [queueIsLoading, setQueueIsLoading] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [queueHasMore, setQueueHasMore] = useState(false);
  const queuePageRef = useRef(1);
  const detailRequestIdRef = useRef(0);

  const loadQueue = useCallback(
    async (append = false) => {
      const requestId = queueRequestIdRef.current + 1;
      queueRequestIdRef.current = requestId;
      setQueueIsLoading(true);
      setQueueError(null);

      try {
        const response = await searchService.getVoteQueue({
          type: selectedType,
          feedId: queueFeedIdRef.current ?? undefined,
          page: append ? queuePageRef.current + 1 : 1,
        });
        if (queueRequestIdRef.current !== requestId) {
          return;
        }

        queueFeedIdRef.current = response.feedId;
        queuePageRef.current = append ? queuePageRef.current + 1 : 1;
        setResults(response.results);
        setNextResults((current) =>
          append ? [...current, ...response.nextResults] : response.nextResults,
        );
        setQueueHasMore(response.hasMore);
      } catch (error_) {
        if (queueRequestIdRef.current !== requestId) {
          return;
        }
        console.error('Failed to fetch vote queue:', error_);
        setQueueError('Failed to load voting queue. Please try again.');
      } finally {
        if (queueRequestIdRef.current === requestId) {
          setQueueIsLoading(false);
        }
      }
    },
    [selectedType],
  );

  useEffect(() => {
    queuePageRef.current = 1;
    setResults([]);
    setNextResults([]);
    void loadQueue();
  }, [loadQueue]);

  const fetchNextItem = useCallback(async () => {
    const [item] = results;
    if (!item) {
      if (!queueIsLoading) {
        setFeedState(createFeedState({ isComplete: true }));
      }
      return;
    }

    const requestId = detailRequestIdRef.current + 1;
    detailRequestIdRef.current = requestId;
    setFeedState(createFeedState({ isLoading: true }));

    try {
      const currentMedia = await searchService.getMediaDetails({
        id: item.tmdbId,
        type: item.type,
      });
      if (detailRequestIdRef.current === requestId) {
        setFeedState(createFeedState({ currentMedia }));
      }
    } catch (error_) {
      if (detailRequestIdRef.current === requestId) {
        console.error('Failed to load current voting item:', error_);
        setFeedState(createFeedState({ error: 'Failed to load next item. Please try again.' }));
      }
    }
  }, [queueIsLoading, results]);

  useEffect(() => {
    void fetchNextItem();
  }, [fetchNextItem]);

  const updateItem = useCallback(
    (item: Media) => {
      setResults((current) =>
        current.filter(
          (candidate) => candidate.tmdbId !== item.tmdbId || candidate.type !== item.type,
        ),
      );
      setNextResults((current) =>
        current.filter(
          (candidate) => candidate.tmdbId !== item.tmdbId || candidate.type !== item.type,
        ),
      );

      if (
        feedState.currentMedia?.tmdbId === item.tmdbId &&
        feedState.currentMedia.type === item.type
      ) {
        setFeedState(createFeedState({ isLoading: true }));
      }
    },
    [feedState.currentMedia],
  );

  const onTypeChange = (type: SearchType) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('type', type);
      return next;
    });
  };

  return {
    ...feedState,
    selectedType,
    fetchNextItem,
    onTypeChange,
    results,
    nextResults,
    queueIsLoading,
    queueIsComplete: !queueIsLoading && !isDefined(queueError) && results.length === 0,
    queueError,
    queueHasMore,
    updateItem,
    retryQueue: loadQueue,
    loadMore: async () => loadQueue(true),
  };
}
