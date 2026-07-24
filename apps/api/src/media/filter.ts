import {
  regionGroups,
  unifiedGenres,
  type GenreKey,
  type RegionGroupId,
} from '@findarr/shared/constants';
import type { InteractionFilter } from '@findarr/shared/interaction';
import type { Media, MediaType } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';

import { toMediaKey } from '../utils/helper.js';

/**
 * Filter criteria for TMDB results
 */
export interface FilterCriteria {
  type: MediaType | 'both';
  regions: RegionGroupId[];
  genres: GenreKey[];
}

/**
 * Check if the media item matches the requested type.
 * - "both" bypasses type filtering.
 */
const typeMatches = (item: Media, type: FilterCriteria['type']): boolean =>
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
const regionMatches = (item: Media, regions: RegionGroupId[]): boolean => {
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
 * Check if the media item matches selected genres.
 *
 * Converts unified genre keys into TMDB genre IDs
 * and ensures the item contains at least one allowed ID.
 *
 * If no genres are selected, always returns true.
 */
const genreMatches = (item: Media, genres: GenreKey[]): boolean => {
  const allowedGenreIds = new Set(genres.flatMap<number>((g) => unifiedGenres[g].ids));

  return (
    allowedGenreIds.size === 0 ||
    !isDefined(item.genres) ||
    item.genres.some((g) => allowedGenreIds.has(g.id))
  );
};

/**
 * Main filter function.
 *
 * Combines type, region, and genre filters.
 * Returns true only if the item satisfies all criteria.
 */
export const filterByCriteria = (item: Media, filters: FilterCriteria): boolean =>
  typeMatches(item, filters.type) &&
  regionMatches(item, filters.regions) &&
  genreMatches(item, filters.genres);

/**
 * Check if a media item matches interaction filter state.
 * TODO right now, this is only used for filtering the unvoted items.
 * Right now it's not used but it's handy to check the e.g. scoring by showing all items.
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
