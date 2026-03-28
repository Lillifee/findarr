import axios from 'axios';
import {
  type TMDBSearchParams,
  type TMDBTVSearchParams,
  TMDBSearchResponseSchema,
  type TMDBDiscoverParams,
  type TMDBTrendingParams,
  type TMDBDetailsParams,
  TMDBMovieDetailsSchema,
  TMDBTVDetailsSchema,
  type TMDBGenresParams,
  TMDBGenresResponseSchema,
  TMDBFindResponseSchema,
} from './schemas.js';

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
     * Search for movies or tv shows
     */
    async search(type: 'movie' | 'tv', params: TMDBSearchParams | TMDBTVSearchParams) {
      const response = await client.get(`/search/${type}`, { params });
      return TMDBSearchResponseSchema.parse(response.data);
    },

    /**
     * Discover movies or tv shows with filters
     * All TMDB discover parameters are supported - see TMDBDiscoverParams interface for full list
     */
    async discover(type: 'movie' | 'tv', params: Partial<TMDBDiscoverParams>) {
      const response = await client.get(`/discover/${type}`, { params });
      return TMDBSearchResponseSchema.parse(response.data);
    },

    /**
     * Get trending movies or shows
     */
    async getTrending(type: 'movie' | 'tv', params: TMDBTrendingParams = {}) {
      const { time_window = 'week', page = 1, language } = params;
      const response = await client.get(`/trending/${type}/${time_window}`, {
        params: { page, language },
      });
      return TMDBSearchResponseSchema.parse(response.data);
    },

    /**
     * Get movie or tv details
     * Use append_to_response to fetch related data in a single call (e.g., 'credits,videos,images')
     * By default, fetches credits, keywords, and external_ids for user preference scoring
     */
    async getDetails(type: 'movie' | 'tv', params: TMDBDetailsParams) {
      const { id, append_to_response = 'credits,keywords,external_ids', ...queryParams } = params;
      const response = await client.get(`/${type}/${id}`, {
        params: { ...queryParams, append_to_response },
      });
      return type === 'movie'
        ? TMDBMovieDetailsSchema.parse(response.data)
        : TMDBTVDetailsSchema.parse(response.data);
    },

    /**
     * Get movie or tv genres
     */
    async getGenres(type: 'movie' | 'tv', params?: TMDBGenresParams) {
      const response = await client.get(`/genre/${type}/list`, { params });
      return TMDBGenresResponseSchema.parse(response.data);
    },

    /**
     * Find content by external ID (TVDB, IMDB, etc.)
     * Returns movie_results and tv_results arrays
     */
    async findByExternalId(externalId: string | number, externalSource: 'tvdb_id' | 'imdb_id') {
      const response = await client.get(`/find/${externalId}`, {
        params: { external_source: externalSource },
      });
      return TMDBFindResponseSchema.parse(response.data);
    },
  };
}

export type TMDBClient = ReturnType<typeof createTMDBClient>;
