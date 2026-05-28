import type { MediaType } from '@findarr/shared';

export const toMediaKey = (tmdbId: number, type: MediaType) =>
  `${tmdbId}_${type}`;
