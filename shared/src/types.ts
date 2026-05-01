import type { z } from 'zod';
import type { MediaRecord, MediaInteractionWithUser, MediaVotes } from './db-types.js';
import type {
  SearchQuerySchema,
  DiscoverQuerySchema,
  PopularQuerySchema,
  DetailsQuerySchema,
  ServerEnvSchema,
  GenresQuerySchema,
  LoginSchema,
  CreateUserSchema,
  DeleteUserSchema,
  CreateInteractionSchema,
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

export interface Keyword {
  id: number;
  name: string;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profilePath: string | undefined;
  order: number;
}

export interface Video {
  id: string;
  key: string; // YouTube video key
  name: string;
  site: string; // e.g., "YouTube"
  type: string; // e.g., "Trailer", "Teaser"
  official: boolean;
  publishedAt: string | undefined;
}

export interface Image {
  filePath: string;
  width: number;
  height: number;
  aspectRatio: number;
  voteAverage: number;
  voteCount: number;
}

export interface Season {
  seasonNumber: number;
  name: string;
  episodeCount: number;
  airDate: string | undefined;

  // Sync status from Sonarr/Jellyfin
  status?: 'none' | 'requested' | 'monitored' | 'downloaded' | 'available';
}

export type MediaStatus =
  | 'pending'
  | 'requested'
  | 'downloading'
  | 'downloaded'
  | 'available'
  | 'warning';

export type InteractionType = 'liked' | 'disliked';

export interface MediaScore {
  recencyScore: number;
  trendingScore: number;
  popularityScore: number;
  weightedRating: number;
  baseScore: number;
  baseTrendingScore: number;
  genreScore: number;
  keywordScore: number;
  userScore: number;
  finalScore: number;
  finalTrendingScore: number;
}

/**
 * Server-computed and database state for media
 * All fields optional - added progressively by server enrichment
 */
export interface MediaState {
  // Computed ranking/scoring
  score?: MediaScore;

  // Database record (if media exists in our system)
  record?: MediaRecord;

  // Current user's interactions
  interactions?: MediaInteractionWithUser[];

  // Vote counts
  votes?: MediaVotes;
}

/**
 * Base fields common to Movie and TVShow
 */
export interface Media {
  tmdbId: number;
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

  // Optional fields
  trendingRank?: number | undefined; // added for trending items
  keywords?: Keyword[]; // populated from catalog_cache for popular items

  // Server-added state (computed scores, database records, user interactions)
  state?: MediaState;
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

export interface MediaDetailsBase {
  status: string;
  homepage: string | undefined;
  imdbId: string | undefined;
  cast: CastMember[] | undefined;
  videos: Video[] | undefined;
}

/**
 * Movie Details - extends Movie with additional fields
 */
export interface MovieDetails extends Movie, MediaDetailsBase {
  tagline: string | undefined;
  runtime: number | undefined;
  budget: number;
  revenue: number;
}

/**
 * TV Show Details - extends TVShow with additional fields
 */
export interface TVDetails extends TVShow, MediaDetailsBase {
  originalName: string;
  episodeRunTime: number[];
  lastAirDate: string | undefined;
  showType: string;
  numberOfSeasons: number;
  numberOfEpisodes: number;
  seasons: Season[];
  tvdbId: number | undefined;
}

export type MediaDetails = MovieDetails | TVDetails;

/**
 * Shared paginated media response wrapper
 */
export interface PaginatedMediaResponse {
  results: Media[];
  page: number;
  totalPages: number;
}

export type SearchResponse = PaginatedMediaResponse;
export type DiscoverResponse = PaginatedMediaResponse;
export type UserInteractionsResponse = PaginatedMediaResponse;

/**
 * Swipe/Vote response - returns next unvoted media item
 */
export interface SwipeNextResponse {
  media: MediaDetails | null;
}

export interface PopularResponse {
  results: Media[];
  page: number;
  totalPages: number;
  feedId: string;
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
export type InteractionFilter = 'all' | 'unvoted' | 'voted';

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
// export type User = z.infer<typeof UserSchema>;

export type CreateUser = z.infer<typeof CreateUserSchema>;
export type DeleteUser = z.infer<typeof DeleteUserSchema>;

// ============================================================================
// Media Interaction Types
// ============================================================================

export type CreateMediaInteraction = z.infer<typeof CreateInteractionSchema>;

// ============================================================================
// Scheduler Types
// ============================================================================

export interface SchedulerState {
  name: string;
  description: string;
  enabled: boolean;
  isRunning: boolean;
  lastRun: number | null; // Timestamp
  nextRun: number | null; // Timestamp (null = stopped/manual trigger only)
  lastDuration: number | null; // ms
  lastError: string | null;
  interval: number; // Default interval in milliseconds
}
