import type { Media } from '@findarr/shared/media';
import { useCallback, useEffect, useRef, useState } from 'react';

import { searchService } from '../services/api';

export interface DashboardData {
  nextMedia: Media | undefined;
  availableResults: Media[];
  loadingHero: boolean;
  loadingAvailable: boolean;
  heroError: string | undefined;
}

export function useDashboardData(): DashboardData {
  const [nextMedia, setNextMedia] = useState<Media | undefined>();
  const [availableResults, setAvailableResults] = useState<Media[]>([]);
  const [loadingHero, setLoadingHero] = useState(true);
  const [loadingAvailable, setLoadingAvailable] = useState(true);
  const [heroError, setHeroError] = useState<string | undefined>();
  const requestIdRef = useRef(0);

  const loadDashboard = useCallback(() => {
    const requestId = (requestIdRef.current += 1);

    setLoadingHero(true);
    setLoadingAvailable(true);
    setHeroError(undefined);

    const loadHero = async () => {
      try {
        const result = await searchService.getNextUnvotedMedia({ type: 'both' });
        if (requestId !== requestIdRef.current) {
          return;
        }
        setNextMedia(result.media);
        setHeroError(undefined);
      } catch (err) {
        console.error('Failed to load next voting candidate:', err);
        if (requestId !== requestIdRef.current) {
          return;
        }
        setNextMedia(undefined);
        setHeroError('Could not load your next voting pick right now.');
      } finally {
        if (requestId === requestIdRef.current) {
          setLoadingHero(false);
        }
      }
    };

    const loadAvailable = async () => {
      try {
        const result = await searchService.getAvailableMedia({ page: 1, type: 'both' });
        if (requestId !== requestIdRef.current) {
          return;
        }
        setAvailableResults(result.results);
      } catch (err) {
        console.error('Failed to load newly available media:', err);
        if (requestId !== requestIdRef.current) {
          return;
        }
        setAvailableResults([]);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoadingAvailable(false);
        }
      }
    };

    void loadHero();
    void loadAvailable();
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return {
    nextMedia,
    availableResults,
    loadingHero,
    loadingAvailable,
    heroError,
  };
}
