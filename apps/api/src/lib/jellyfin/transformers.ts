import { isDefined } from '@findarr/shared/utils';

import type { LibMedia } from '../types.js';
import type { JellyfinItem } from './schemas.js';

function toTimestamp(value: string | undefined): number | undefined {
  if (!isDefined(value)) {
    return undefined;
  }
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? undefined : timestamp;
}

/**
 * Transform a Jellyfin item to the shared LibMedia format.
 * Returns undefined if the item has no TMDB ID.
 */
export function jellyfinItemToMedia(item: JellyfinItem, baseUrl: string): LibMedia | undefined {
  const tmdbId = item.ProviderIds?.Tmdb;
  if (!isDefined(tmdbId)) {
    return undefined;
  }

  const tmdbIdNum = Number.parseInt(tmdbId, 10);
  if (Number.isNaN(tmdbIdNum)) {
    return undefined;
  }

  const type = item.Type === 'Movie' ? 'movie' : 'tv';
  const libAddedAt = toTimestamp(item.DateCreated);

  return {
    type,
    libId: item.Id,
    libUrl: `${baseUrl}/web/index.html?#/details?id=${item.Id}`,
    tmdbId: tmdbIdNum,
    ...(isDefined(libAddedAt) ? { libAddedAt } : {}),
  };
}
