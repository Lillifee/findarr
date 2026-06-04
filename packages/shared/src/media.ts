import type { User } from './auth.js';
import type { DbMedia, DbUserMediaInteraction } from './db.js';

// ============================================================================
// Media Composite Types - Derived from DB rows
// ============================================================================

export type MediaRecord = Omit<DbMedia, 'tmdbId' | 'type'>;
export type MediaUser = Omit<User, 'role'>;
export type MediaInteraction = Omit<DbUserMediaInteraction, 'mediaId' | 'userId'>;

export interface MediaInteractionWithUser extends MediaInteraction {
  user?: MediaUser;
}

export interface MediaVotes {
  likes?: number;
  dislikes?: number;
}

// ============================================================================
// Core Media Types
// ============================================================================

export type MediaType = 'movie' | 'tv';
export type SearchType = 'movie' | 'tv' | 'both';

export type MediaStatus =
  | 'pending'
  | 'requested'
  | 'downloading'
  | 'downloaded'
  | 'available'
  | 'warning';

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
  key: string;
  type: string;
  name: string;
  site: string;
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
  type: MediaType;
  name: string;
  date: string | undefined;
  posterPath: string | undefined;
  backdropPath: string | undefined;
  overview: string | undefined;
  voteAverage: number;
  voteCount: number;
  popularity: number;
  originalLanguage: string;
  originCountry: string[] | undefined;
  genres: Genre[];

  // Optional fields
  trendingRank?: number | undefined;
  keywords?: Keyword[];
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

// ============================================================================
// Response Wrappers
// ============================================================================

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
export type AvailableMediaResponse = PaginatedMediaResponse;

/**
 * Swipe/Vote response - returns next unvoted media item
 */
export interface SwipeNextResponse {
  feedId: string;
  media: MediaDetails | undefined;
}

export interface PopularResponse {
  results: Media[];
  page: number;
  totalPages: number;
  feedId: string;
}
