import type { Media, SearchType } from '@findarr/shared/media';
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
    (personId: number, discoveryName: string) => {
      void navigate(`/explore?${buildCatalogSearchParams({ personId, discoveryName }).toString()}`);
    },
    [navigate],
  );

  const goToKeyword = useCallback(
    (keywordId: number, discoveryName: string, type: SearchType) => {
      void navigate(
        `/explore?${buildCatalogSearchParams({ keywordId, discoveryName, type }).toString()}`,
      );
    },
    [navigate],
  );

  return { goTo, goToMedia, goToSearch, goToPerson, goToKeyword };
}
