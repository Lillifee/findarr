import axios from 'axios';
import {
  TMDBSearchResponseSchema,
  TMDBMovieDetailsSchema,
  TMDBTVDetailsSchema,
  TMDBGenresResponseSchema,
  type TMDBSearchResponse,
  type TMDBMovieDetails,
  type TMDBTVDetails,
  type TMDBSearchParams,
  type TMDBTVSearchParams,
  type TMDBDiscoverParams,
  type TMDBTrendingParams,
  type TMDBDetailsParams,
  type TMDBGenresParams,
} from './schemas';

/**
 * Create a TMDB API client with configured axios instance
 * Pure API client - 1:1 mapping with TMDB API endpoints
 * Returns raw TMDB response types with minimal transformation
 */
export function createTMDBClient(
  accessToken: string,
  baseURL: string = 'https://api.themoviedb.org/3'
) {
  const client = axios.create({
    baseURL,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  return {
    /**
     * Search for movies
     */
    async searchMovies(params: TMDBSearchParams): Promise<TMDBSearchResponse> {
      const response = await client.get('/search/movie', { params });
      return TMDBSearchResponseSchema.parse(response.data);
    },

    /**
     * Search for TV shows
     */
    async searchTV(params: TMDBTVSearchParams): Promise<TMDBSearchResponse> {
      const response = await client.get('/search/tv', { params });
      return TMDBSearchResponseSchema.parse(response.data);
    },

    /**
     * Discover movies with filters
     * All TMDB discover parameters are supported - see TMDBDiscoverParams interface for full list
     */
    async discoverMovies(params: Partial<TMDBDiscoverParams>): Promise<TMDBSearchResponse> {
      const response = await client.get('/discover/movie', { params });
      return TMDBSearchResponseSchema.parse(response.data);
    },

    /**
     * Discover TV shows with filters
     * All TMDB discover parameters are supported - see TMDBDiscoverParams interface for full list
     */
    async discoverTV(params: Partial<TMDBDiscoverParams>): Promise<TMDBSearchResponse> {
      const response = await client.get('/discover/tv', { params });
      return TMDBSearchResponseSchema.parse(response.data);
    },

    /**
     * Get trending movies
     */
    async getTrendingMovies(params: TMDBTrendingParams = {}): Promise<TMDBSearchResponse> {
      const { time_window = 'week', page = 1, language } = params;
      const response = await client.get(`/trending/movie/${time_window}`, {
        params: { page, language },
      });
      return TMDBSearchResponseSchema.parse(response.data);
    },

    /**
     * Get trending TV shows
     */
    async getTrendingTV(params: TMDBTrendingParams = {}): Promise<TMDBSearchResponse> {
      const { time_window = 'week', page = 1, language } = params;
      const response = await client.get(`/trending/tv/${time_window}`, {
        params: { page, language },
      });
      return TMDBSearchResponseSchema.parse(response.data);
    },

    /**
     * Get movie details
     * Use append_to_response to fetch related data in a single call (e.g., 'credits,videos,images')
     */
    async getMovieDetails(params: TMDBDetailsParams): Promise<TMDBMovieDetails> {
      const { id, ...queryParams } = params;
      const response = await client.get(`/movie/${id}`, { params: queryParams });
      return TMDBMovieDetailsSchema.parse(response.data);
    },

    /**
     * Get TV show details
     */
    async getTVDetails(params: TMDBDetailsParams): Promise<TMDBTVDetails> {
      const { id, ...queryParams } = params;
      const response = await client.get(`/tv/${id}`, { params: queryParams });
      return TMDBTVDetailsSchema.parse(response.data);
    },

    /**
     * Get movie genres
     */
    async getMovieGenres(params?: TMDBGenresParams) {
      const response = await client.get('/genre/movie/list', { params });
      return TMDBGenresResponseSchema.parse(response.data);
    },

    /**
     * Get TV genres
     */
    async getTVGenres(params?: TMDBGenresParams) {
      const response = await client.get('/genre/tv/list', { params });
      return TMDBGenresResponseSchema.parse(response.data);
    },
  };
}

export type TMDBClient = ReturnType<typeof createTMDBClient>;
