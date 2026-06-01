import type { MediaType } from '@findarr/shared';

export const toMediaKey = (tmdbId: number, type: MediaType) => `${tmdbId}_${type}`;

export const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
