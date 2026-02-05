import type { RegionGroupId, Media } from '@findarr/shared';

/**
 * Region groups for TMDB API filtering
 * Maps application-level region IDs to TMDB-specific country/language codes
 */
export const REGION_GROUPS: Record<
  RegionGroupId,
  { name: string; languages: string[]; countries: string[]; description: string }
> = {
  western: {
    name: 'Western',
    languages: ['en', 'de', 'fr', 'es', 'it', 'nl', 'pt', 'da', 'sv', 'no', 'fi', 'is'],
    countries: [
      'US',
      'GB',
      'CA',
      'AU',
      'NZ',
      'IE',
      'ZA', // English-speaking
      'DE',
      'FR',
      'ES',
      'IT',
      'NL',
      'PT',
      'BE',
      'AT',
      'CH',
      'LU', // Western Europe
      'DK',
      'SE',
      'NO',
      'FI',
      'IS', // Nordic
    ],
    description:
      'English-speaking countries, Western Europe, and Nordic countries (US, UK, Germany, France, etc.)',
  },
  'eastern-europe': {
    name: 'Eastern Europe',
    languages: ['pl', 'cs', 'sk', 'hu', 'ro', 'bg', 'hr', 'sl', 'ru', 'uk', 'lv', 'lt', 'et'],
    countries: [
      'PL',
      'CZ',
      'SK',
      'HU',
      'RO',
      'BG',
      'HR',
      'SI',
      'RU',
      'UA',
      'BY',
      'MD', // Eastern Europe
      'LV',
      'LT',
      'EE', // Baltic
    ],
    description:
      'Eastern European countries including Russia, Poland, Czech Republic, and Baltic states',
  },
  asian: {
    name: 'Asian',
    languages: [
      'ja',
      'ko',
      'zh',
      'cn', // East Asia
      'hi',
      'ta',
      'te',
      'bn',
      'ur',
      'pa',
      'gu',
      'ml',
      'kn',
      'or', // South Asia
      'th',
      'vi',
      'id',
      'ms',
      'my',
      'km',
      'lo',
      'fil',
      'tl', // Southeast Asia
    ],
    countries: [
      'JP',
      'KR',
      'CN',
      'HK',
      'TW',
      'MO', // East Asia
      'IN',
      'PK',
      'BD',
      'LK',
      'NP',
      'BT',
      'MV',
      'AF', // South Asia
      'TH',
      'VN',
      'ID',
      'MY',
      'SG',
      'PH',
      'KH',
      'LA',
      'MM',
      'BN', // Southeast Asia
    ],
    description:
      'All Asian countries including Japan, Korea, China, India, Thailand, Indonesia, Philippines, etc.',
  },
  'latin-america': {
    name: 'Latin America',
    languages: ['es', 'pt', 'fr'],
    countries: [
      'MX',
      'BR',
      'AR',
      'CL',
      'CO',
      'PE',
      'VE',
      'EC',
      'BO',
      'PY',
      'UY',
      'GT',
      'CR',
      'PA',
      'CU',
      'DO',
      'HN',
      'NI',
      'SV',
    ],
    description:
      'Latin American countries including Mexico, Brazil, Argentina, Chile, Colombia, Peru, etc.',
  },
  'middle-east-africa': {
    name: 'Middle East & Africa',
    languages: ['ar', 'fa', 'tr', 'he', 'sw', 'am'],
    countries: [
      'SA',
      'AE',
      'IR',
      'TR',
      'IL',
      'EG',
      'IQ',
      'SY',
      'JO',
      'LB',
      'KW',
      'QA',
      'BH',
      'OM',
      'YE', // Middle East
      'NG',
      'KE',
      'ET',
      'GH',
      'UG',
      'TZ',
      'ZW',
      'ZM',
      'MW',
      'RW',
      'SN',
      'ML',
      'BF',
      'NE',
      'TD',
      'CF',
      'CM',
      'GA',
      'CG',
      'CD',
      'AO',
      'MZ',
      'MG',
      'MU',
      'SC', // Africa
    ],
    description:
      'Middle Eastern and African countries including Saudi Arabia, Turkey, Egypt, Nigeria, Kenya, etc.',
  },
};

/**
 * Build region filters from selected region groups
 */
export function buildRegionFilters(regionGroups: RegionGroupId[]): {
  languageFilter: string;
  countryFilter: string;
} {
  const allRegions = Object.keys(REGION_GROUPS) as RegionGroupId[];
  const isShowingAll = regionGroups.length === 0 || regionGroups.length === allRegions.length;

  if (isShowingAll) {
    return { languageFilter: '', countryFilter: '' };
  }

  const includedLanguages = regionGroups.flatMap(groupId => REGION_GROUPS[groupId].languages);
  const includedCountries = regionGroups.flatMap(groupId => REGION_GROUPS[groupId].countries);

  return {
    languageFilter: includedLanguages.join('|'),
    countryFilter: includedCountries.join('|'),
  };
}

/**
 * Calculate date range from days back
 */
export function getDateRangeFromDays(days: number): { pastDate: Date; futureDate: Date } {
  const today = new Date();
  const futureDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000); // today + 1 week
  const pastDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);

  return { pastDate, futureDate };
}

/**
 * Build date parameters for discover queries
 */
export function buildDateParams(
  recentDays: number | undefined,
  type: 'movie' | 'tv' | 'both'
): Record<string, string> {
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
}

/**
 * Filter criteria for TMDB results
 */
export interface FilterCriteria {
  type: 'movie' | 'tv' | 'both';
  languageFilter: string;
  countryFilter: string;
  genresFilter?: string;
}

/**
 * Filter media items by criteria
 * Used for post-fetch filtering when TMDB API doesn't support certain filters
 */
export function filterByCriteria(item: Media, filters: FilterCriteria): boolean {
  // Media type filter
  if (filters.type !== 'both' && item.type !== filters.type) {
    return false;
  }

  // Language filter
  if (
    filters.languageFilter &&
    !filters.languageFilter.split('|').includes(item.original_language)
  ) {
    return false;
  }

  // Country filter
  if (filters.countryFilter && item.origin_country) {
    const itemCountries = Array.isArray(item.origin_country)
      ? item.origin_country
      : [item.origin_country];
    const allowedCountries = filters.countryFilter.split('|');
    if (!itemCountries.some(country => allowedCountries.includes(country))) {
      return false;
    }
  }

  // Genre filter
  if (filters.genresFilter && item.genres) {
    const selectedGenres = filters.genresFilter.split('|').map(Number);
    const itemGenres = item.genres.map(g => g.id);
    if (!selectedGenres.some(genreId => itemGenres.includes(genreId))) {
      return false;
    }
  }

  return true;
}
