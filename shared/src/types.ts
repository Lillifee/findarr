import type { z } from 'zod';
import type {
  SearchQuerySchema,
  DiscoverQuerySchema,
  PopularQuerySchema,
  DetailsQuerySchema,
  ServerEnvSchema,
  GenresQuerySchema,
} from './schemas.js';

// ============================================================================
// Application Types - Media (Movies and TV Shows)
// ============================================================================

/**
 * Application types for media (movies and TV shows)
 * These are the clean, unified types used throughout the application
 * Separate from TMDB API types which live in server/src/schemas/tmdb.ts
 */

export interface Genre {
  id: number;
  name: string;
}

/**
 * Base fields common to Movie and TVShow
 */
export interface Media {
  id: number;
  type: 'movie' | 'tv';
  name: string;
  date: string | null;
  poster_path: string | null;
  overview: string | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  original_language: string;
  origin_country: string[] | undefined; // TV-specific field - empty array for movies
  genres: Genre[];

  // Custom enrichment fields added by server
  trending_rank?: number;
  custom_popularity?: number;
}

/**
 * Movie type - used in search/discover results
 */
export interface Movie extends Media {
  type: 'movie';
}

/**
 * TV Show type - used in search/discover results
 */
export interface TVShow extends Media {
  type: 'tv';
}

/**
 * Movie Details - extends Movie with additional fields
 */
export interface MovieDetails extends Movie {
  tagline: string | null;
  runtime: number | null;
  budget: number;
  revenue: number;
  status: string;
  homepage: string | null;
  imdb_id: string | null;
}

/**
 * TV Show Details - extends TVShow with additional fields
 */
export interface TVDetails extends TVShow {
  original_name: string;
  episode_run_time: number[];
  show_type: string;
  number_of_seasons: number;
  number_of_episodes: number;
  status: string;
  homepage: string | null;
}

export type MediaDetails = MovieDetails | TVDetails;

/**
 * Search response wrapper
 */
export interface SearchResponse {
  results: Media[];
  page: number;
  total_pages: number;
  total_results: number;
}

/**
 * Discover response wrapper
 */
export interface DiscoverResponse {
  results: Media[];
  page?: number;
  total_pages?: number;
  total_results?: number;
}

// ============================================================================
// Server Configuration Types
// ============================================================================

// Server configuration types
export type ServerEnv = z.infer<typeof ServerEnvSchema>;

// ============================================================================
// Core Application Types
// ============================================================================

// Core application types
export type MediaType = 'movie' | 'tv';
export type SearchType = 'movie' | 'tv' | 'both';

// ============================================================================
// Request Types (inferred from schemas)
// ============================================================================

// Request types (inferred from schemas)
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
export type DiscoverQuery = z.infer<typeof DiscoverQuerySchema>;
export type PopularQuery = z.infer<typeof PopularQuerySchema>;
export type DetailsQuery = z.infer<typeof DetailsQuerySchema>;
export type GenresQuery = z.infer<typeof GenresQuerySchema>;
