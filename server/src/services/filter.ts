import {
  type GenreKey,
  type Media,
  type RegionGroupId,
  regionGroups,
  unifiedGenres,
} from '@findarr/shared';

/**
 * Filter criteria for TMDB results
 */
export interface FilterCriteria {
  type: 'movie' | 'tv' | 'both';
  regions: RegionGroupId[];
  genres: GenreKey[];
}

/**
 * Filter media items by criteria
 * Used for post-fetch filtering when TMDB API doesn't support certain filters
 */
export const filterByCriteria = (item: Media, filters: FilterCriteria) => {
  // --- Type ---
  if (filters.type !== 'both' && item.type !== filters.type) {
    return false;
  }

  // --- Regions ---
  const regionGroupsSelected = filters.regions.map(rg => regionGroups[rg]);
  const allowedLanguages = new Set(regionGroupsSelected.flatMap<string>(rg => rg.languages));

  if (allowedLanguages.size > 0 && !allowedLanguages.has(item.original_language)) {
    return false;
  }

  const allowedCountries = new Set(regionGroupsSelected.flatMap<string>(rg => rg.countries));

  if (allowedCountries.size > 0 && item.origin_country) {
    const itemCountries = Array.isArray(item.origin_country)
      ? item.origin_country
      : [item.origin_country];

    if (!itemCountries.some(c => allowedCountries.has(c))) {
      return false;
    }
  }

  // --- Genres ---
  const allowedGenreIds = new Set(filters.genres.flatMap<number>(g => unifiedGenres[g]?.ids ?? []));

  if (
    allowedGenreIds.size > 0 &&
    item.genres &&
    !item.genres.some(g => allowedGenreIds.has(g.id))
  ) {
    return false;
  }

  return true;
};
