import { z } from 'zod';

// Server environment schema
export const ServerEnvSchema = z.object({
  TMDB_ACCESS_TOKEN: z.string(),
  TMDB_BASE_URL: z.url().default('https://api.themoviedb.org/3'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
});

// Request validation schemas
const BaseQuerySchema = z.object({
  language: z.string().optional(),
});

export const SearchQuerySchema = BaseQuerySchema.extend({
  query: z.string().min(1),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  include_adult: z.coerce.boolean().default(false),
  type: z.enum(['movie', 'tv', 'both']).default('both'),
});

// Recent content period enum
export const RecentPeriodSchema = z.enum([
  'last_week',
  'last_month',
  'last_3_months',
  'last_6_months',
  'last_year',
  'last_2_years',
]);

// Export the enum values for use in components
export const RECENT_PERIOD_VALUES = RecentPeriodSchema.options;

// Region groups for content filtering
export const REGION_GROUPS = {
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
} as const;

export type RegionGroupId = keyof typeof REGION_GROUPS;

export const RegionGroupSchema = z.preprocess(
  val => {
    // Handle query parameter serialization - convert string to array if needed
    if (typeof val === 'string') {
      return val === '' ? [] : [val];
    }
    if (Array.isArray(val)) {
      return val;
    }
    return []; // Default fallback
  },
  z
    .array(z.enum(['western', 'eastern-europe', 'asian', 'latin-america', 'middle-east-africa']))
    .default([]) // Default to no filtering - show all content
);

export const DiscoverQuerySchema = BaseQuerySchema.extend({
  page: z.coerce.number().int().min(1).max(1000).optional(),
  type: z.enum(['movie', 'tv', 'both']).optional(),
  sort_by: z
    .enum([
      'popularity.desc',
      'popularity.asc',
      'release_date.desc',
      'release_date.asc',
      'vote_average.desc',
      'vote_average.asc',
      'vote_count.desc',
      'vote_count.asc',
      'revenue.desc',
      'revenue.asc',
    ])
    .optional(),
  // Recent content filter
  recent_period: RecentPeriodSchema.optional(),
  // Region-based filtering (replaces individual language/country filtering)
  region_groups: RegionGroupSchema.optional(),

  // Advanced filtering options (kept for backwards compatibility)
  with_original_language: z.string().optional(), // Include only these languages (comma-separated)
  with_origin_country: z.string().optional(), // Include only these countries (comma-separated)

  // Genre filtering
  with_genres: z.string().optional(), // comma-separated genre IDs
  without_genres: z.string().optional(),
  // Release date filtering
  primary_release_year: z.coerce.number().int().min(1900).max(2100).optional(),
  primary_release_date_gte: z.string().optional(), // YYYY-MM-DD
  primary_release_date_lte: z.string().optional(), // YYYY-MM-DD
  // For TV shows - first air date
  first_air_date_year: z.coerce.number().int().min(1900).max(2100).optional(),
  first_air_date_gte: z.string().optional(), // YYYY-MM-DD
  first_air_date_lte: z.string().optional(), // YYYY-MM-DD
  // Vote filtering
  vote_average_gte: z.coerce.number().min(0).max(10).optional(),
  vote_average_lte: z.coerce.number().min(0).max(10).optional(),
  vote_count_gte: z.coerce.number().min(0).optional(),
  vote_count_lte: z.coerce.number().min(0).optional(),
  // Runtime filtering (movies only)
  with_runtime_gte: z.coerce.number().min(0).optional(),
  with_runtime_lte: z.coerce.number().min(0).optional(),
  // Companies and keywords
  with_companies: z.string().optional(), // comma-separated company IDs
  with_keywords: z.string().optional(), // comma-separated keyword IDs
  without_keywords: z.string().optional(),
  // Additional filters
  include_adult: z.coerce.boolean().optional(),
  include_video: z.coerce.boolean().optional(), // movies only
  watch_region: z.string().optional(), // ISO 3166-1 code
  with_watch_providers: z.string().optional(), // comma-separated provider IDs
  with_watch_monetization_types: z.enum(['flatrate', 'free', 'ads', 'rent', 'buy']).optional(),
});

export const DetailsQuerySchema = BaseQuerySchema.extend({
  id: z.coerce.number().int().positive(),
  type: z.enum(['movie', 'tv']),
});

// TMDB API response schemas
export const TMDBMovieSchema = z.object({
  id: z.number(),
  title: z.string(),
  overview: z.string().nullable(),
  poster_path: z.string().nullable(),
  backdrop_path: z.string().nullable(),
  release_date: z.string().nullable(),
  vote_average: z.number(),
  vote_count: z.number(),
  popularity: z.number(),
  genre_ids: z.array(z.number()),
  adult: z.boolean(),
  original_language: z.string(),
  original_title: z.string(),
  video: z.boolean(),
});

export const TMDBTVSchema = z.object({
  id: z.number(),
  name: z.string(),
  overview: z.string().nullable(),
  poster_path: z.string().nullable(),
  backdrop_path: z.string().nullable(),
  first_air_date: z.string().nullable(),
  vote_average: z.number(),
  vote_count: z.number(),
  popularity: z.number(),
  genre_ids: z.array(z.number()),
  origin_country: z.array(z.string()),
  original_language: z.string(),
  original_name: z.string(),
});

export const TMDBSearchResponseSchema = z.object({
  page: z.number(),
  results: z.array(z.union([TMDBMovieSchema, TMDBTVSchema])),
  total_pages: z.number(),
  total_results: z.number(),
});

export const TMDBGenreSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export const TMDBMovieDetailsSchema = TMDBMovieSchema.extend({
  genres: z.array(TMDBGenreSchema),
  runtime: z.number().nullable(),
  budget: z.number(),
  revenue: z.number(),
  status: z.string(),
  tagline: z.string().nullable(),
  homepage: z.string().nullable(),
  imdb_id: z.string().nullable(),
});

export const TMDBTVDetailsSchema = TMDBTVSchema.extend({
  genres: z.array(TMDBGenreSchema),
  episode_run_time: z.array(z.number()),
  number_of_episodes: z.number(),
  number_of_seasons: z.number(),
  status: z.string(),
  type: z.string(),
  homepage: z.string().nullable(),
});
