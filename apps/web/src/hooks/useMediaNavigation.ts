import type { Media, SearchType } from '@findarr/shared/media';
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { buildCatalogSearchParams, type DiscoveryType } from '../utils/catalogSearchParams';

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

  const goToDiscovery = useCallback(
    (kind: DiscoveryType, id: number, discoveryName: string, type: SearchType = 'both') => {
      void navigate(
        `/explore?${buildCatalogSearchParams({
          type,
          discovery: { type: kind, id, name: discoveryName },
        }).toString()}`,
      );
    },
    [navigate],
  );

  return { goTo, goToMedia, goToSearch, goToDiscovery };
}
