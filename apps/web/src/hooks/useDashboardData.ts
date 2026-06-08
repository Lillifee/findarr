import type { Media } from '@findarr/shared/media';
import { useCallback, useEffect, useRef, useState } from 'react';

import { searchService } from '../services/api';

export interface DashboardData {
  nextMedia: Media | undefined;
  availableResults: Media[];
  availableHasMore: boolean;
  loadingHero: boolean;
  loadingAvailable: boolean;
  heroError: string | undefined;
  availableError: string | undefined;
}

export function useDashboardData(): DashboardData {
  const [nextMedia, setNextMedia] = useState<Media | undefined>();
  const [availableResults, setAvailableResults] = useState<Media[]>([]);
  const [availableHasMore, setAvailableHasMore] = useState(false);
  const [loadingHero, setLoadingHero] = useState(true);
  const [loadingAvailable, setLoadingAvailable] = useState(true);
  const [heroError, setHeroError] = useState<string | undefined>();
  const [availableError, setAvailableError] = useState<string | undefined>();
  const requestIdRef = useRef(0);

  const loadDashboard = useCallback(async () => {
    const requestId = (requestIdRef.current += 1);

    setLoadingHero(true);
    setLoadingAvailable(true);
    setHeroError(undefined);
    setAvailableError(undefined);

    const [nextResult, availableResult] = await Promise.allSettled([
      searchService.getNextUnvotedMedia({ type: 'both', interaction: 'unvoted' }),
      searchService.getAvailableMedia({ page: 1, type: 'both' }),
    ]);

    if (requestId !== requestIdRef.current) {
      return;
    }

    if (nextResult.status === 'fulfilled') {
      setNextMedia(nextResult.value.media);
      setHeroError(undefined);
    } else {
      console.error('Failed to load next voting candidate:', nextResult.reason);
      setNextMedia(undefined);
      setHeroError('Could not load your next voting pick right now.');
    }
    setLoadingHero(false);

    if (availableResult.status === 'fulfilled') {
      setAvailableResults(availableResult.value.results);
      setAvailableHasMore(availableResult.value.page < availableResult.value.totalPages);
      setAvailableError(undefined);
    } else {
      console.error('Failed to load newly available media:', availableResult.reason);
      setAvailableResults([]);
      setAvailableHasMore(false);
      setAvailableError('Newly available titles are unavailable right now.');
    }
    setLoadingAvailable(false);
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  return {
    nextMedia,
    availableResults,
    availableHasMore,
    loadingHero,
    loadingAvailable,
    heroError,
    availableError,
  };
}
