import type { Media } from '@findarr/shared/media';
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { buildCatalogSearchParams } from '../utils/catalogSearchParams';

export function useMediaNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  const goTo = useCallback(
    (to: string) => {
      void navigate(to);
    },
    [navigate],
  );

  const goToMedia = useCallback(
    (item: Media) => {
      void navigate(`/${item.type}/${item.tmdbId}`, {
        state: { backgroundLocation: location },
      });
    },
    [location, navigate],
  );

  const goToSearch = useCallback(
    (query: string) => {
      void navigate(`/explore?${buildCatalogSearchParams({ q: query }).toString()}`);
    },
    [navigate],
  );

  const goToPerson = useCallback(
    (personId: number) => {
      void navigate(`/explore?${buildCatalogSearchParams({ personId, type: 'movie' }).toString()}`);
    },
    [navigate],
  );

  return { goTo, goToMedia, goToSearch, goToPerson };
}
