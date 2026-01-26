import { z } from 'zod';
import {
  TMDBMovieSchema,
  TMDBTVSchema,
  TMDBSearchResponseSchema,
  TMDBMovieDetailsSchema,
  TMDBTVDetailsSchema,
  TMDBGenreSchema,
  TMDBVideoSchema,
  TMDBVideosResponseSchema,
  SearchQuerySchema,
  DiscoverQuerySchema,
  DetailsQuerySchema,
  ServerEnvSchema,
  RecentPeriodSchema,
} from './schemas';

// Server configuration types
export type ServerEnv = z.infer<typeof ServerEnvSchema>;

// Core application types
export type MediaType = 'movie' | 'tv';
export type SearchType = 'movie' | 'tv' | 'both';
export type RecentPeriod = z.infer<typeof RecentPeriodSchema>;

// TMDB API types (inferred from schemas)
export type Movie = z.infer<typeof TMDBMovieSchema>;
export type TVShow = z.infer<typeof TMDBTVSchema>;
export type SearchResponse = z.infer<typeof TMDBSearchResponseSchema>;
export type MovieDetails = z.infer<typeof TMDBMovieDetailsSchema>;
export type TVDetails = z.infer<typeof TMDBTVDetailsSchema>;
export type Genre = z.infer<typeof TMDBGenreSchema>;
export type Video = z.infer<typeof TMDBVideoSchema>;
export type VideosResponse = z.infer<typeof TMDBVideosResponseSchema>;

// Request/Response types (inferred from schemas)
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
export type DiscoverQuery = z.infer<typeof DiscoverQuerySchema>;
export type DetailsQuery = z.infer<typeof DetailsQuerySchema>;

// Application-specific types
export interface MediaItem {
  id: number;
  title: string;
  overview: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
}

export interface RequestItem {
  id: number;
  mediaType: MediaType;
  tmdbId: number;
  title: string;
  status: 'pending' | 'approved' | 'downloaded' | 'failed';
  requestedAt: Date;
  userId?: string;
}
