import type { MediaType } from '@findarr/shared/media';

export const toMediaKey = (tmdbId: number, type: MediaType) => `${tmdbId}_${type}`;

export const sleep = async (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
