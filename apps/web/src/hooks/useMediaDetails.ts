import type { MediaDetails } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';
import { useEffect, useState } from 'react';

import { searchService } from '../services/api';

export interface MediaDetailsState {
  details: MediaDetails | null;
  loading: boolean;
  error: string | null;
}

export function useMediaDetails(type: 'movie' | 'tv', id: string | undefined): MediaDetailsState {
  const [details, setDetails] = useState<MediaDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);

    const loadDetails = async () => {
      if (!isDefined(id)) {
        setError('Invalid media ID');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const mediaDetails = await searchService.getMediaDetails({
          id: Number.parseInt(id, 10),
          type,
        });
        setDetails(mediaDetails);
      } catch (error_) {
        console.error('Failed to fetch details:', error_);
        setError('Failed to load media details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    void loadDetails();
  }, [type, id]);

  return { details, loading, error };
}
