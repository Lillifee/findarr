import type { Media } from '@findarr/shared/media';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { buildCatalogSearchParams } from '../utils/catalogSearchParams';

export function useMediaNavigation() {
  const navigate = useNavigate();

  const goTo = useCallback(
    (to: string) => {
      void navigate(to);
    },
    [navigate],
  );

  const goToMedia = useCallback(
    (item: Media, beforeNavigate?: () => void) => {
      beforeNavigate?.();
      void navigate(`/${item.type}/${item.tmdbId}`);
    },
    [navigate],
  );

  const goToSearch = useCallback(
    (query: string) => {
      void navigate(`/explore?${buildCatalogSearchParams({ q: query }).toString()}`);
    },
    [navigate],
  );

  return { goTo, goToMedia, goToSearch };
}
