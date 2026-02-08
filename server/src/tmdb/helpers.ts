import {
  type RegionGroupId,
  regionGroups,
  GenreKey,
  unifiedGenres,
  regionGroupKeys,
  DiscoverQuery,
} from '@findarr/shared';
import { TMDBDiscoverParams } from './schemas';

/**
 * Build region filters from selected region groups
 */
export const buildRegionFilters = (regions: RegionGroupId[]) => {
  // Show all if no regions selected
  if (regions.length === 0 || regions.length === regionGroupKeys.length) {
    return { languageFilter: '', countryFilter: '' };
  }

  const includedLanguages = regions.flatMap(groupId => regionGroups[groupId].languages);
  const includedCountries = regions.flatMap(groupId => regionGroups[groupId].countries);

  return {
    languageFilter: includedLanguages.join('|'),
    countryFilter: includedCountries.join('|'),
  };
};

/**
 * Build genre filter string for TMDB API from selected genre keys
 */
export const buildGenreFilter = (genres: GenreKey[] | undefined) =>
  genres?.length ? genres.flatMap(g => unifiedGenres[g]?.ids ?? []).join('|') : '';

/**
 * Calculate date range from days back
 */
export const getDateRangeFromDays = (days: number) => {
  const today = new Date();
  const futureDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000); // today + 1 week
  const pastDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);

  return { pastDate, futureDate };
};

/**
 * Build date parameters for discover queries
 */
export const buildDateParams = (recentDays: number | undefined, type: 'movie' | 'tv' | 'both') => {
  if (!recentDays) return {};

  const { pastDate, futureDate } = getDateRangeFromDays(recentDays);
  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const dateParams: Record<string, string> = {};

  if (type === 'movie' || type === 'both') {
    dateParams['primary_release_date.gte'] = formatDate(pastDate);
    dateParams['primary_release_date.lte'] = formatDate(futureDate);
  }

  if (type === 'tv' || type === 'both') {
    dateParams['air_date.gte'] = formatDate(pastDate);
    dateParams['air_date.lte'] = formatDate(futureDate);
  }

  return dateParams;
};

export const buildDiscoverParams = (params: DiscoverQuery): TMDBDiscoverParams => {
  const {
    type = 'both',
    language = 'en-US',
    recentDays,
    regionGroups = [],
    withGenres,
    page = 1,
  } = params;

  const region = language.includes('-') ? language.split('-')[1] : 'US';
  const { languageFilter, countryFilter } = buildRegionFilters(regionGroups);
  const genreFilter = buildGenreFilter(withGenres);
  const dateParams = buildDateParams(recentDays, type);

  return {
    page,
    region,
    language,
    watch_region: region,
    ...dateParams,
    ...(languageFilter && { with_original_language: languageFilter }),
    ...(countryFilter && { with_origin_country: countryFilter }),
    ...(genreFilter && { with_genres: genreFilter }),
  };
};
