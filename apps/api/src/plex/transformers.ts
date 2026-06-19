import type { MediaType } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';

import type { PlexMetadataItem } from './schemas.js';

export interface PlexMedia {
  tmdbId: number;
  type: MediaType;
  libId: string;
  libUrl: string;
  libAddedAt?: number;
  availableSeasons?: number[];
}

/**
 * Transform Plex metadata item to application format.
 * Returns undefined if item doesn't have a TMDB Guid (can't match to our system).
 */
export function plexItemToMedia(
  item: PlexMetadataItem,
  baseUrl: string,
  machineIdentifier: string,
): PlexMedia | undefined {
  const tmdbGuid = item.Guid?.find((g) => g.id.startsWith('tmdb://'));
  if (!isDefined(tmdbGuid)) {
    return undefined;
  }

  const tmdbIdNum = Number.parseInt(tmdbGuid.id.replace('tmdb://', ''), 10);
  if (Number.isNaN(tmdbIdNum)) {
    return undefined;
  }

  const type: MediaType = item.type === 'movie' ? 'movie' : 'tv';
  // Plex addedAt is unix seconds, convert to ms
  const libAddedAt = isDefined(item.addedAt) ? item.addedAt * 1000 : undefined;

  return {
    type,
    libId: item.ratingKey,
    libUrl: `${baseUrl}/web/index.html#!/server/${machineIdentifier}/details?key=%2Flibrary%2Fmetadata%2F${item.ratingKey}`,
    tmdbId: tmdbIdNum,
    ...(isDefined(libAddedAt) ? { libAddedAt } : {}),
  };
}
