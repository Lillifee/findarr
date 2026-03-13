import type { JellyfinItem } from './schemas.js';

export interface JellyfinMedia {
  jellyfinId: string;
  tmdbId: number;
  type: 'movie' | 'tv';
}

/**
 * Transform Jellyfin item to application format
 * Returns undefined if item doesn't have TMDB ID (can't match to our system)
 */
export function jellyfinItemToMedia(item: JellyfinItem): JellyfinMedia | undefined {
  // Must have TMDB ID to match with our media database
  const tmdbId = item.ProviderIds?.Tmdb;
  if (!tmdbId) {
    return undefined;
  }

  const tmdbIdNum = Number.parseInt(tmdbId, 10);
  if (Number.isNaN(tmdbIdNum)) {
    return undefined;
  }

  // Map Jellyfin type to our media type
  const type = item.Type === 'Movie' ? 'movie' : 'tv';

  return {
    type,
    jellyfinId: item.Id,
    tmdbId: tmdbIdNum,
  };
}
