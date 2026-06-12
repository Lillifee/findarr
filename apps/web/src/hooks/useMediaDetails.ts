import type { MediaDetails } from '@findarr/shared/media';
import { useEffect, useState } from 'react';

import { searchService } from '../services/api';

export interface MediaDetailsState {
  details: MediaDetails | null;
  loading: boolean;
  error: string | null;
}

const initialState: MediaDetailsState = {
  details: null,
  loading: true,
  error: null,
};

export function useMediaDetails(type: 'movie' | 'tv', id: string | undefined): MediaDetailsState {
  const [state, setState] = useState<MediaDetailsState>(initialState);

  useEffect(() => {
    window.scrollTo(0, 0);

    const mediaId = Number(id);
    let ignore = false;

    if (!Number.isInteger(mediaId) || mediaId <= 0) {
      setState({
        details: null,
        loading: false,
        error: 'Invalid media ID',
      });
    } else {
      const loadDetails = async () => {
        setState({ details: null, loading: true, error: null });

        try {
          const mediaDetails = await searchService.getMediaDetails({
            id: mediaId,
            type,
          });

          if (!ignore) {
            setState({ details: mediaDetails, loading: false, error: null });
          }
        } catch (error_) {
          console.error('Failed to fetch details:', error_);

          if (!ignore) {
            setState({
              details: null,
              loading: false,
              error: 'Failed to load media details. Please try again.',
            });
          }
        }
      };

      void loadDetails();
    }

    return () => {
      ignore = true;
    };
  }, [type, id]);

  return state;
}
