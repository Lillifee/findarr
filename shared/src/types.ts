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
  GenresQuerySchema,
  TMDBGenresResponseSchema,
  TMDBDiscoverResponseSchema,
} from './schemas';

// Server configuration types
export type ServerEnv = z.infer<typeof ServerEnvSchema>;

// Core application types
export type MediaType = 'movie' | 'tv';
export type SearchType = 'movie' | 'tv' | 'both';

// TMDB API types (inferred from schemas)
export type Movie = z.infer<typeof TMDBMovieSchema>;
export type TVShow = z.infer<typeof TMDBTVSchema>;
export type MovieDetails = z.infer<typeof TMDBMovieDetailsSchema>;
export type TVDetails = z.infer<typeof TMDBTVDetailsSchema>;
export type Genre = z.infer<typeof TMDBGenreSchema>;
export type Video = z.infer<typeof TMDBVideoSchema>;

export type MovieOrTVShow = Movie | TVShow;

// Request/Response types (inferred from schemas)
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
export type DiscoverQuery = z.infer<typeof DiscoverQuerySchema>;
export type DetailsQuery = z.infer<typeof DetailsQuerySchema>;
export type VideosQuery = z.infer<typeof DetailsQuerySchema>;
export type GenresQuery = z.infer<typeof GenresQuerySchema>;

export type SearchResponse = z.infer<typeof TMDBSearchResponseSchema>;
export type DiscoverResponse = z.infer<typeof TMDBDiscoverResponseSchema>;
export type DetailsResponse = MovieDetails | TVDetails;
export type VideosResponse = z.infer<typeof TMDBVideosResponseSchema>;
export type GenresResponse = z.infer<typeof TMDBGenresResponseSchema>;

// Type guard functions
export function isSearchResponse(
  response: SearchResponse | DiscoverResponse
): response is SearchResponse {
  return 'total_pages' in response;
}

export function isMovie(item: Movie | TVShow): item is Movie {
  return item.media_type === 'movie';
}
