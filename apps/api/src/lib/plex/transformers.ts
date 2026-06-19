import { isDefined } from '@findarr/shared/utils';

import type { LibMedia } from '../types.js';
import type { PlexMetadataItem } from './schemas.js';

/**
 * Transform a Plex metadata item to the shared LibMedia format.
 * Returns undefined if the item has no TMDB GUID.
 */
export function plexItemToMedia(
  item: PlexMetadataItem,
  baseUrl: string,
  machineIdentifier: string,
): LibMedia | undefined {
  const tmdbGuid = item.Guid?.find((g) => g.id.startsWith('tmdb://'));
  if (!isDefined(tmdbGuid)) {
    return undefined;
  }

  const tmdbIdNum = Number.parseInt(tmdbGuid.id.replace('tmdb://', ''), 10);
  if (Number.isNaN(tmdbIdNum)) {
    return undefined;
  }

  const type = item.type === 'movie' ? 'movie' : 'tv';
  // Plex addedAt is unix seconds → convert to ms
  const libAddedAt = isDefined(item.addedAt) ? item.addedAt * 1000 : undefined;

  return {
    type,
    libId: item.ratingKey,
    libUrl: `${baseUrl}/web/index.html#!/server/${machineIdentifier}/details?key=%2Flibrary%2Fmetadata%2F${item.ratingKey}`,
    tmdbId: tmdbIdNum,
    ...(isDefined(libAddedAt) ? { libAddedAt } : {}),
  };
}
