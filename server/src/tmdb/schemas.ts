import { z } from 'zod';

/**
 * Raw TMDB API response schemas - keep 1:1 with TMDB API
 * These schemas validate the exact structure returned by TMDB without any transformations
 */

// Base fields shared between movies and TV shows
const TMDBBaseFieldsSchema = z.object({
  id: z.number(),
  overview: z.string().nullable(),
  poster_path: z.string().nullable(),
  backdrop_path: z.string().nullable(),
  vote_average: z.number(),
  vote_count: z.number(),
  popularity: z.number(),
  genre_ids: z.array(z.number()).optional(),
  original_language: z.string(),
  origin_country: z.array(z.string()).optional(), // Only in TV shows
});

// TMDB Movie schema (search/discover results)
export const TMDBMovieSchema = TMDBBaseFieldsSchema.extend({
  title: z.string(),
  release_date: z.string().nullable(),
  original_title: z.string(),
  adult: z.boolean().optional(),
  video: z.boolean().optional(),
}).transform(data => ({
  type: 'movie' as const,
  ...data,
}));

// TMDB TV Show schema (search/discover results)
export const TMDBTVSchema = TMDBBaseFieldsSchema.extend({
  name: z.string(),
  first_air_date: z.string().nullable(),
  original_name: z.string(),
}).transform(data => ({
  type: 'tv' as const,
  ...data,
}));

// TMDB Genre schema
export const TMDBGenreSchema = z.object({
  id: z.number(),
  name: z.string(),
});

//#region Append-to-response Schemas

/**
 * Append-to-response Zod schemas (shared between movies and TV shows)
 */
const TMDBCastMemberSchema = z.object({
  id: z.number(),
  name: z.string(),
  character: z.string(),
  profile_path: z.string().nullable(),
  order: z.number(),
});

const TMDBCrewMemberSchema = z.object({
  id: z.number(),
  name: z.string(),
  job: z.string(),
  department: z.string(),
  profile_path: z.string().nullable(),
});

const TMDBCreditsSchema = z.object({
  cast: z.array(TMDBCastMemberSchema),
  crew: z.array(TMDBCrewMemberSchema),
});

const TMDBVideoSchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  site: z.string(),
  size: z.number(),
  type: z.string(),
  official: z.boolean(),
  published_at: z.string(),
});

const TMDBVideosSchema = z.object({
  results: z.array(TMDBVideoSchema),
});

const TMDBImageSchema = z.object({
  file_path: z.string(),
  width: z.number(),
  height: z.number(),
  aspect_ratio: z.number(),
  vote_average: z.number(),
  vote_count: z.number(),
});

const TMDBImagesSchema = z.object({
  backdrops: z.array(TMDBImageSchema),
  posters: z.array(TMDBImageSchema),
  logos: z.array(TMDBImageSchema).optional(),
});

const TMDBKeywordSchema = z.object({
  id: z.number(),
  name: z.string(),
});

// Keywords schema (different structure for movies vs TV)
const TMDBMovieKeywordsSchema = z.object({
  keywords: z.array(TMDBKeywordSchema),
});

const TMDBTVKeywordsSchema = z.object({
  results: z.array(TMDBKeywordSchema),
});

// Base append fields (shared between movies and TV)
const TMDBAppendFieldsSchema = {
  credits: TMDBCreditsSchema.optional(),
  videos: TMDBVideosSchema.optional(),
  images: TMDBImagesSchema.optional(),
};

//#endregion

// TMDB Movie Details schema
export const TMDBMovieDetailsSchema = TMDBBaseFieldsSchema.omit({ genre_ids: true })
  .extend({
    title: z.string(),
    release_date: z.string().nullable(),
    original_title: z.string(),
    genres: z.array(TMDBGenreSchema),
    runtime: z.number().nullable(),
    budget: z.number(),
    revenue: z.number(),
    status: z.string(),
    tagline: z.string().nullable(),
    homepage: z.string().nullable(),
    imdb_id: z.string().nullable(),
    adult: z.boolean().optional(),
    // Append-to-response fields
    ...TMDBAppendFieldsSchema,
    keywords: TMDBMovieKeywordsSchema.optional(),
  })
  .transform(data => ({
    ...data,
    type: 'movie' as const,
  }));

// TMDB TV Show Details schema
export const TMDBTVDetailsSchema = TMDBBaseFieldsSchema.omit({ genre_ids: true })
  .extend({
    name: z.string(),
    first_air_date: z.string().nullable(),
    original_name: z.string(),
    genres: z.array(TMDBGenreSchema),
    episode_run_time: z.array(z.number()),
    number_of_episodes: z.number(),
    number_of_seasons: z.number(),
    status: z.string(),
    type: z.string(),
    homepage: z.string().nullable(),
    // Append-to-response fields
    ...TMDBAppendFieldsSchema,
    keywords: TMDBTVKeywordsSchema.optional(),
  })
  .transform(data => ({
    ...data,
    type: 'tv' as const,
    show_type: data.type,
  }));

// TMDB API response wrappers
export const TMDBSearchResponseSchema = z.object({
  page: z.number(),
  results: z.array(z.union([TMDBMovieSchema, TMDBTVSchema])),
  total_pages: z.number(),
  total_results: z.number(),
});

export const TMDBDiscoverResponseSchema = z.object({
  page: z.number().optional(),
  results: z.array(z.union([TMDBMovieSchema, TMDBTVSchema])),
  total_pages: z.number().optional(),
  total_results: z.number().optional(),
});

export const TMDBGenresResponseSchema = z.object({
  genres: z.array(TMDBGenreSchema),
});

/**
 * TMDB API Parameter Type Definitions
 * TypeScript interfaces for internal type safety (not runtime validation)
 */

/**
 * Movie search parameters
 */
export interface TMDBSearchParams {
  query: string;
  page?: number;
  language?: string;
  region?: string;
  include_adult?: boolean;
  primary_release_year?: number;
  year?: number;
}

/**
 * TV search parameters
 */
export interface TMDBTVSearchParams {
  query: string;
  page?: number;
  language?: string;
  include_adult?: boolean;
  first_air_date_year?: number;
  year?: number;
}

/**
 * Discover parameters for movies and TV shows
 *
 * @remarks
 * Available sort_by values:
 * - popularity.asc | popularity.desc
 * - release_date.asc | release_date.desc (movies)
 * - first_air_date.asc | first_air_date.desc (TV)
 * - revenue.asc | revenue.desc (movies)
 * - primary_release_date.asc | primary_release_date.desc (movies)
 * - original_title.asc | original_title.desc (movies)
 * - vote_average.asc | vote_average.desc
 * - vote_count.asc | vote_count.desc
 *
 * Date filters use dotted notation (e.g., 'primary_release_date.gte')
 *
 * Watch provider monetization types: flatrate | free | ads | rent | buy (pipe-separated)
 *
 * @example
 * ```typescript
 * const params: TMDBDiscoverParams = {
 *   page: 1,
 *   sort_by: 'popularity.desc',
 *   'primary_release_date.gte': '2024-01-01',
 *   'vote_average.gte': 7.0,
 *   with_genres: '28,12', // Action, Adventure
 *   with_watch_monetization_types: 'flatrate|free'
 * };
 * ```
 */
export interface TMDBDiscoverParams {
  // Pagination & language
  page?: number;
  language?: string;
  region?: string;
  sort_by?: string;

  // Watch providers
  watch_region?: string;
  with_watch_providers?: string;
  with_watch_monetization_types?: string;

  // Language and country filters
  with_original_language?: string;
  with_origin_country?: string;

  // Genre filters (pipe-separated for AND, comma-separated for OR)
  with_genres?: string;
  without_genres?: string;

  // Movie date filters (YYYY-MM-DD format)
  'primary_release_date.gte'?: string;
  'primary_release_date.lte'?: string;
  primary_release_year?: number;
  'release_date.gte'?: string;
  'release_date.lte'?: string;
  year?: number;

  // TV date filters (YYYY-MM-DD format)
  'air_date.gte'?: string;
  'air_date.lte'?: string;
  'first_air_date.gte'?: string;
  'first_air_date.lte'?: string;
  first_air_date_year?: number;
  timezone?: string;

  // Vote filters
  'vote_average.gte'?: number;
  'vote_average.lte'?: number;
  'vote_count.gte'?: number;
  'vote_count.lte'?: number;

  // Runtime filters (minutes)
  'with_runtime.gte'?: number;
  'with_runtime.lte'?: number;

  // Certification filters
  certification?: string;
  'certification.gte'?: string;
  'certification.lte'?: string;
  certification_country?: string;

  // People & company filters (comma-separated IDs)
  with_cast?: string;
  with_crew?: string;
  with_people?: string;
  with_companies?: string;
  without_companies?: string;

  // Keyword filters (comma for AND, pipe for OR)
  with_keywords?: string;
  without_keywords?: string;

  // TV-specific filters
  with_networks?: string;
  screened_theatrically?: boolean;
  with_status?: number; // 0=Returning, 1=Planned, 2=Production, 3=Ended, 4=Cancelled, 5=Pilot
  with_type?: number; // 0=Documentary, 1=News, 2=Miniseries, 3=Reality, 4=Scripted, 5=Talk Show, 6=Video
  include_null_first_air_dates?: boolean;

  // Release type filter (pipe-separated: 1=Premiere, 2=Theatrical Limited, 3=Theatrical, 4=Digital, 5=Physical, 6=TV)
  with_release_type?: number;

  // Additional flags
  include_adult?: boolean;
  include_video?: boolean;
}

/**
 * Available append_to_response values for TMDB details endpoints
 */
export const APPEND_TO_RESPONSE_VALUES = [
  'credits',
  'videos',
  'images',
  'recommendations',
  'similar',
  'reviews',
  'keywords',
  'watch/providers',
  'translations',
  'release_dates', // Movies only
  'content_ratings', // TV only
  'external_ids',
  'alternative_titles',
] as const;

export type AppendToResponseValue = (typeof APPEND_TO_RESPONSE_VALUES)[number];

/**
 * Creates a comma-separated append_to_response string for TMDB API calls
 */
export function createAppendToResponse(...values: AppendToResponseValue[]): string {
  return values.join(',');
}

/**
 * Trending parameters
 */
export interface TMDBTrendingParams {
  page?: number;
  language?: string;
  time_window?: 'day' | 'week';
}

/**
 * Details parameters with append_to_response support
 *
 * @remarks
 * Use createAppendToResponse() helper for type-safe append_to_response values.
 * See AppendToResponseValue type for all available options.
 *
 * @example
 * ```typescript
 * const params: TMDBDetailsParams = {
 *   id: 550,
 *   language: 'en-US',
 *   append_to_response: createAppendToResponse('credits', 'videos', 'images')
 * };
 * ```
 */
export interface TMDBDetailsParams {
  id: number;
  language?: string;
  append_to_response?: string;
}

/**
 * Genre list parameters
 */
export interface TMDBGenresParams {
  language?: string;
}

// Type exports
export type TMDBMovie = z.infer<typeof TMDBMovieSchema>;
export type TMDBTVShow = z.infer<typeof TMDBTVSchema>;
export type TMDBMovieDetails = z.infer<typeof TMDBMovieDetailsSchema>;
export type TMDBTVDetails = z.infer<typeof TMDBTVDetailsSchema>;
export type TMDBGenre = z.infer<typeof TMDBGenreSchema>;
export type TMDBSearchResponse = z.infer<typeof TMDBSearchResponseSchema>;
export type TMDBDiscoverResponse = z.infer<typeof TMDBDiscoverResponseSchema>;
export type TMDBGenresResponse = z.infer<typeof TMDBGenresResponseSchema>;
