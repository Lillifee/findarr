import { isDefined } from '@findarr/shared/utils';

export type TmdbImageSize = 'w185' | 'w342' | 'w500' | 'w1280' | 'original';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export function tmdbImage(path: string, size: TmdbImageSize): string {
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function tmdbImageOrUndefined(
  path: string | null | undefined,
  size: TmdbImageSize,
): string | undefined {
  return isDefined(path) ? tmdbImage(path, size) : undefined;
}

export function releaseYear(date: string | null | undefined, fallback = 'N/A'): string {
  return isDefined(date) ? String(new Date(date).getFullYear()) : fallback;
}
