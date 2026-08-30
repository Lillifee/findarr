import type { Media, SearchType } from '@findarr/shared/media';
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { buildCatalogSearchParams } from '../utils/catalogSearchParams';

type DiscoveryKind = 'person' | 'keyword' | 'genre';

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
    (kind: DiscoveryKind, id: number, discoveryName: string, type: SearchType = 'both') => {
      void navigate(
        `/explore?${buildCatalogSearchParams({
          discoveryName,
          type,
          ...(kind === 'person' ? { personId: id } : {}),
          ...(kind === 'keyword' ? { keywordId: id } : {}),
          ...(kind === 'genre' ? { genreId: id } : {}),
        }).toString()}`,
      );
    },
    [navigate],
  );

  return { goTo, goToMedia, goToSearch, goToDiscovery };
}
