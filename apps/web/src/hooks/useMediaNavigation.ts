import type { Media, SearchType } from '@findarr/shared/media';
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  buildCatalogSearchParams,
  readCatalogSearchParams,
  type DiscoveryType,
} from '../utils/catalogSearchParams';

const getBackgroundSearch = (state: unknown): string | undefined => {
  if (typeof state !== 'object' || state === null || !('backgroundLocation' in state)) {
    return undefined;
  }
  const { backgroundLocation } = state;
  return typeof backgroundLocation === 'object' &&
    backgroundLocation !== null &&
    'search' in backgroundLocation &&
    typeof backgroundLocation.search === 'string'
    ? backgroundLocation.search
    : undefined;
};

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
      const sourceSearch = getBackgroundSearch(location.state) ?? location.search;
      const currentFilters = readCatalogSearchParams(new URLSearchParams(sourceSearch));
      void navigate(
        `/explore?${buildCatalogSearchParams({
          type,
          discovery: [...(currentFilters.discovery ?? []), { type: kind, id, name: discoveryName }],
          q: undefined,
        }).toString()}`,
      );
    },
    [location.search, location.state, navigate],
  );

  return { goTo, goToMedia, goToSearch, goToDiscovery };
}
