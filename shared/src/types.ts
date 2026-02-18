import type { z } from 'zod';
import type {
  SearchQuerySchema,
  DiscoverQuerySchema,
  PopularQuerySchema,
  DetailsQuerySchema,
  ServerEnvSchema,
  GenresQuerySchema,
  LoginSchema,
  CreateUserSchema,
  UserSchema,
  DeleteUserSchema,
  CreateMediaRequestSchema,
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
  date: string | undefined;
  posterPath: string | undefined;
  backdropPath: string | undefined;
  overview: string | undefined;
  voteAverage: number;
  voteCount: number;
  popularity: number;
  originalLanguage: string;
  originCountry: string[] | undefined; // TV-specific field - empty array for movies
  genres: Genre[];

  // Custom enrichment fields added by server
  trendingRank?: number;
  customPopularity?: number;
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
  tagline: string | undefined;
  runtime: number | undefined;
  budget: number;
  revenue: number;
  status: string;
  homepage: string | undefined;
  imdbId: string | undefined;
}

/**
 * TV Show Details - extends TVShow with additional fields
 */
export interface TVDetails extends TVShow {
  originalName: string;
  episodeRunTime: number[];
  showType: string;
  numberOfSeasons: number;
  numberOfEpisodes: number;
  status: string;
  homepage: string | undefined;
}

export type MediaDetails = MovieDetails | TVDetails;

/**
 * Search response wrapper
 */
export interface SearchResponse {
  results: Media[];
  page: number;
  totalPages: number;
  totalResults: number;
}

/**
 * Discover response wrapper
 */
export interface DiscoverResponse {
  results: Media[];
  page?: number;
  totalPages?: number;
  totalResults?: number;
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

// ============================================================================
// Authentication & User Types
// ============================================================================

export type Login = z.infer<typeof LoginSchema>;
export type User = z.infer<typeof UserSchema>;

export type CreateUser = z.infer<typeof CreateUserSchema>;
export type DeleteUser = z.infer<typeof DeleteUserSchema>;

// ============================================================================
// Media Request Types
// ============================================================================

export type CreateMediaRequest = z.infer<typeof CreateMediaRequestSchema>;

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'available';

export interface MediaRequest {
  id: number;
  userId: number;
  mediaType: 'movie' | 'tv';
  tmdbId: number;
  title: string;
  posterPath: string | undefined;
  status: RequestStatus;
  requestedAt: number;
  updatedAt: number;
}

export interface MediaRequestWithUser extends MediaRequest {
  userEmail: string;
  userDisplayName: string;
}
