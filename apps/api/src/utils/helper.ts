import type { SeasonRecord } from '@findarr/shared/db';
import type { MediaType } from '@findarr/shared/media';

export const toMediaKey = (tmdbId: number, type: MediaType) => `${tmdbId}_${type}`;

export const sleep = async (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Merge a set of available season numbers into existing season records.
 * - If existing records are present, marks matching seasons as 'available' and
 *   leaves others at their current status.
 * - If no existing records, seeds new records from availableSeasons (all 'available').
 * Returns null when availableSeasons is empty/undefined (no-op for the upsert).
 */
export function mergeAvailableSeasons(
  existing: SeasonRecord[],
  availableSeasons: number[] | undefined,
): SeasonRecord[] | null {
  if (!availableSeasons || availableSeasons.length === 0) {
    return null;
  }

  const availableSet = new Set(availableSeasons);

  if (existing.length > 0) {
    return existing.map((season) => ({
      seasonNumber: season.seasonNumber,
      status: availableSet.has(season.seasonNumber) ? 'available' : season.status,
    }));
  }

  return availableSeasons.map((seasonNumber) => ({ seasonNumber, status: 'available' as const }));
}
