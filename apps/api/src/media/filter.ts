import { regionGroups, type RegionGroupId } from '@findarr/shared/constants';
import type { InteractionFilter } from '@findarr/shared/interaction';
import type { Media, MediaType } from '@findarr/shared/media';

import { toMediaKey } from '../utils/helper.js';

/**
 * Check if the media item matches the requested type.
 * - "both" bypasses type filtering.
 */
export const filterByMediaType = (item: Media, type: MediaType | 'both'): boolean =>
  type === 'both' || item.type === type;

/**
 * Check if the media item matches region filters.
 *
 * Applies:
 * - Language filtering
 * - Country filtering
 *
 * If no regions are selected, always returns true.
 */
export const filterByRegions = (item: Media, regions: RegionGroupId[]): boolean => {
  const regionGroupsSelected = regions.map((rg) => regionGroups[rg]).filter(Boolean);

  const allowedLanguages = new Set(regionGroupsSelected.flatMap<string>((rg) => rg.languages));

  const languageMatches =
    allowedLanguages.size === 0 || allowedLanguages.has(item.originalLanguage);

  const allowedCountries = new Set(regionGroupsSelected.flatMap<string>((rg) => rg.countries));

  const countryMatches =
    allowedCountries.size === 0 ||
    !item.originCountry ||
    item.originCountry.some((c) => allowedCountries.has(c));

  return languageMatches && countryMatches;
};

/**
 * Check if a media item matches interaction filter state.
 */
export const filterByInteraction = (
  item: Media,
  interactionKeys: Set<string>,
  interaction: InteractionFilter = 'unvoted',
): boolean => {
  const hasInteraction = interactionKeys.has(toMediaKey(item.tmdbId, item.type));

  if (interaction === 'all') {
    return true;
  }
  if (interaction === 'voted') {
    return hasInteraction;
  }

  return !hasInteraction;
};
