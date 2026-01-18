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

export const DiscoverQuerySchema = BaseQuerySchema.extend({
  page: z.coerce.number().int().min(1).max(1000).optional(),
  type: z.enum(['movie', 'tv', 'both']).optional(),
  sort_by: z
    .enum(['popularity.desc', 'release_date.desc', 'vote_average.desc', 'revenue.desc'])
    .optional(),
  with_genres: z.string().optional(),
  primary_release_year: z.coerce.number().int().min(1900).max(2100).optional(),
  vote_average_gte: z.coerce.number().min(0).max(10).optional(),
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
