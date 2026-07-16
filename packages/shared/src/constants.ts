import { objectKeys } from './utils.js';

/**
 * Number of distinct user likes required before a movie or TV show (or an
 * individual TV season) is automatically requested from Radarr/Sonarr.
 * Admin likes always bypass this threshold.
 */
export const COMMUNITY_VOTE_THRESHOLD = 3;

export interface RegionGroup {
  name: string;
  languages: string[];
  countries: string[];
  description: string;
}

/**
 * Region groups for TMDB API filtering
 * Maps application-level region IDs to TMDB-specific country/language codes
 */
export const regionGroups = {
  western: {
    name: 'Western',
    languages: ['en', 'de', 'fr', 'es', 'it', 'nl', 'pt', 'da', 'sv', 'no', 'fi', 'is'],
    countries: [
      // English-speaking
      'US',
      'GB',
      'CA',
      'AU',
      'NZ',
      'IE',
      'ZA',
      // Western Europe
      'DE',
      'FR',
      'ES',
      'IT',
      'NL',
      'PT',
      'BE',
      'AT',
      'CH',
      'LU',
      // Nordic
      'DK',
      'SE',
      'NO',
      'FI',
      'IS',
    ],
    description:
      'English-speaking countries, Western Europe, and Nordic countries (US, UK, Germany, France, etc.)',
  },
  'eastern-europe': {
    name: 'Eastern Europe',
    languages: ['pl', 'cs', 'sk', 'hu', 'ro', 'bg', 'hr', 'sl', 'ru', 'uk', 'lv', 'lt', 'et'],
    countries: [
      // Eastern Europe
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
      'MD',
      // Baltic
      'LV',
      'LT',
      'EE',
    ],
    description:
      'Eastern European countries including Russia, Poland, Czech Republic, and Baltic states',
  },
  asian: {
    name: 'Asian',
    languages: [
      // East Asia
      'ja',
      'ko',
      'zh',
      'cn',
      // South Asia
      'hi',
      'ta',
      'te',
      'bn',
      'ur',
      'pa',
      'gu',
      'ml',
      'kn',
      'or',
      // Southeast Asia
      'th',
      'vi',
      'id',
      'ms',
      'my',
      'km',
      'lo',
      'fil',
      'tl',
    ],
    countries: [
      // East Asia
      'JP',
      'KR',
      'CN',
      'HK',
      'TW',
      'MO',
      // South Asia
      'IN',
      'PK',
      'BD',
      'LK',
      'NP',
      'BT',
      'MV',
      'AF',
      // Southeast Asia
      'TH',
      'VN',
      'ID',
      'MY',
      'SG',
      'PH',
      'KH',
      'LA',
      'MM',
      'BN',
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
      // Middle East
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
      'YE',
      // Africa
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
      'SC',
    ],
    description:
      'Middle Eastern and African countries including Saudi Arabia, Turkey, Egypt, Nigeria, Kenya, etc.',
  },
} as const satisfies Record<string, RegionGroup>;

export type RegionGroupId = keyof typeof regionGroups;
export const regionGroupKeys = objectKeys(regionGroups);

export interface UnifiedGenre {
  name: string;
  ids: number[];
}

export const unifiedGenres = {
  // --- Core (movie + tv) ---
  Action: { name: 'Action', ids: [28, 10_759] },
  Adventure: { name: 'Adventure', ids: [12, 10_759] },
  Animation: { name: 'Animation', ids: [16] },
  Comedy: { name: 'Comedy', ids: [35] },
  Crime: { name: 'Crime', ids: [80] },
  Documentary: { name: 'Documentary', ids: [99] },
  Drama: { name: 'Drama', ids: [18] },
  Family: { name: 'Family', ids: [10_751, 10_762] },
  Fantasy: { name: 'Fantasy', ids: [14, 10_765] },
  ScienceFiction: { name: 'Science Fiction', ids: [878, 10_765] },
  Mystery: { name: 'Mystery', ids: [9648] },
  Romance: { name: 'Romance', ids: [10_749] },
  Thriller: { name: 'Thriller', ids: [53] },
  Horror: { name: 'Horror', ids: [27] },
  WarPolitics: { name: 'War & Politics', ids: [10_752, 10_768] },
  Western: { name: 'Western', ids: [37] },

  // --- Movie-only ---
  History: { name: 'History', ids: [36] },
  Music: { name: 'Music', ids: [10_402] },
  TvMovie: { name: 'TV Movie', ids: [10_770] },

  // --- TV-only ---
  News: { name: 'News', ids: [10_763] },
  Reality: { name: 'Reality', ids: [10_764] },
  Soap: { name: 'Soap', ids: [10_766] },
  Talk: { name: 'Talk', ids: [10_767] },
} as const satisfies Record<string, UnifiedGenre>;

export type GenreKey = keyof typeof unifiedGenres;
export const genreKeys = objectKeys(unifiedGenres);
