import type { MediaType } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';

import type { JellyfinItem } from './schemas.js';

export interface JellyfinMedia {
  jellyfinId: string;
  jellyfinAddedAt?: number;
  tmdbId: number;
  type: MediaType;
  availableSeasons?: number[];
}

function toTimestamp(value: string | undefined): number | undefined {
  if (!isDefined(value)) {
    return undefined;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? undefined : timestamp;
}

/**
 * Transform Jellyfin item to application format
 * Returns undefined if item doesn't have TMDB ID (can't match to our system)
 */
export function jellyfinItemToMedia(
  item: JellyfinItem,
  availableSeasons?: number[],
): JellyfinMedia | undefined {
  // Must have TMDB ID to match with our media database
  const tmdbId = item.ProviderIds?.Tmdb;
  if (!isDefined(tmdbId)) {
    return undefined;
  }

  const tmdbIdNum = Number.parseInt(tmdbId, 10);
  if (Number.isNaN(tmdbIdNum)) {
    return undefined;
  }

  // Map Jellyfin type to our media type
  const type = item.Type === 'Movie' ? 'movie' : 'tv';
  const jellyfinAddedAt = toTimestamp(item.DateCreated);

  return {
    type,
    jellyfinId: item.Id,
    tmdbId: tmdbIdNum,
    ...(isDefined(jellyfinAddedAt) ? { jellyfinAddedAt } : {}),
    ...(type === 'tv' && availableSeasons ? { availableSeasons } : {}),
  };
}
