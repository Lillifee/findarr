import { z } from 'zod';
import {
  TMDBMovieSchema,
  TMDBTVSchema,
  TMDBSearchResponseSchema,
  TMDBMovieDetailsSchema,
  TMDBTVDetailsSchema,
  TMDBGenreSchema,
  SearchQuerySchema,
  MovieIdParamsSchema,
  TVIdParamsSchema,
  MediaQuerySchema,
  ServerEnvSchema,
} from './schemas';

// Server configuration types
export type ServerEnv = z.infer<typeof ServerEnvSchema>;

// Core application types
export type MediaType = 'movie' | 'tv';

// TMDB API types (inferred from schemas)
export type Movie = z.infer<typeof TMDBMovieSchema>;
export type TVShow = z.infer<typeof TMDBTVSchema>;
export type SearchResponse = z.infer<typeof TMDBSearchResponseSchema>;
export type MovieDetails = z.infer<typeof TMDBMovieDetailsSchema>;
export type TVDetails = z.infer<typeof TMDBTVDetailsSchema>;
export type Genre = z.infer<typeof TMDBGenreSchema>;

// Request/Response types (inferred from schemas)
export type SearchParams = z.infer<typeof SearchQuerySchema>;
export type MovieIdParams = z.infer<typeof MovieIdParamsSchema>;
export type TVIdParams = z.infer<typeof TVIdParamsSchema>;
export type MediaQuery = z.infer<typeof MediaQuerySchema>;

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
