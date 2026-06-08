import type { Media } from '@findarr/shared/media';
import { useNavigate } from 'react-router-dom';

import { buildCatalogSearchParams } from '../utils/catalogSearchParams';

export function useMediaNavigation() {
  const navigate = useNavigate();

  const goTo = (to: string) => {
    void navigate(to);
  };

  const goToMedia = (item: Media, beforeNavigate?: () => void) => {
    beforeNavigate?.();
    void navigate(`/${item.type}/${item.tmdbId}`);
  };

  const goToSearch = (query: string) => {
    void navigate(`/explore?${buildCatalogSearchParams({ q: query }).toString()}`);
  };

  return { goTo, goToMedia, goToSearch };
}
