import type { Media } from '@findarr/shared/media';

export type MediaKey = Pick<Media, 'tmdbId' | 'type'>;

export function mediaKey(item: MediaKey): string {
  return `${item.type}_${item.tmdbId}`;
}

export function isSameMedia(left: MediaKey, right: MediaKey): boolean {
  return mediaKey(left) === mediaKey(right);
}

export function mergeUniqueMedia(existing: Media[], incoming: Media[]): Media[] {
  const seen = new Set(existing.map((item) => mediaKey(item)));
  const merged = [...existing];

  for (const item of incoming) {
    if (!seen.has(mediaKey(item))) {
      merged.push(item);
      seen.add(mediaKey(item));
    }
  }

  return merged;
}
