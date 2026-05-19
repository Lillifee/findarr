import { isDefined, type MediaType } from '@findarr/shared';
import axios, { type AxiosInstance } from 'axios';
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
export function createTMDBClient() {
  let client: AxiosInstance | undefined;

  async function testConnection(clientToTest: AxiosInstance) {
    const auth = await clientToTest.get('/authentication');
    if (auth.data?.success !== true) {
      throw new Error('TMDB authentication failed');
    }
  }

  return {
    async configure(nextAccessToken: string | undefined) {
      if (!isDefined(nextAccessToken)) {
        client = undefined;
        return;
      }

      const nextClient = axios.create({
        baseURL: 'https://api.themoviedb.org/3',
        headers: {
          ...(nextAccessToken ? { Authorization: `Bearer ${nextAccessToken}` } : {}),
          'Content-Type': 'application/json',
        },
      });

      try {
        await testConnection(nextClient);
        client = nextClient;
      } catch (error) {
        client = undefined;
        throw error;
      }
    },

    async testConnection() {
      await testConnection(this.getClient());
    },

    isConfigured() {
      return isDefined(client);
    },

    getClient(): AxiosInstance {
      if (!client) throw new Error('TMDB client is not configured');
      return client;
    },

    /**
     * Search for movies or tv shows
     */
    async search(type: MediaType, params: TMDBSearchParams | TMDBTVSearchParams) {
      const response = await this.getClient().get(`/search/${type}`, { params });
      return TMDBSearchResponseSchema.parse(response.data);
    },

    /**
     * Discover movies or tv shows with filters
     * All TMDB discover parameters are supported - see TMDBDiscoverParams interface for full list
     */
    async discover(type: MediaType, params: Partial<TMDBDiscoverParams>) {
      const response = await this.getClient().get(`/discover/${type}`, { params });
      return TMDBSearchResponseSchema.parse(response.data);
    },

    /**
     * Get trending movies or shows
     */
    async getTrending(type: MediaType, params: TMDBTrendingParams = {}) {
      const { time_window = 'week', page = 1, language } = params;
      const response = await this.getClient().get(`/trending/${type}/${time_window}`, {
        params: { page, language },
      });
      return TMDBSearchResponseSchema.parse(response.data);
    },

    /**
     * Get movie or tv details
     * Use append_to_response to fetch related data in a single call (e.g., 'credits,videos,images')
     * By default, fetches credits, keywords, external_ids, videos for rich media details
     */
    async getDetails(type: MediaType, params: TMDBDetailsParams) {
      const {
        id,
        append_to_response = 'credits,keywords,external_ids,videos',
        ...queryParams
      } = params;
      const response = await this.getClient().get(`/${type}/${id}`, {
        params: { ...queryParams, append_to_response },
      });
      return type === 'movie'
        ? TMDBMovieDetailsSchema.parse(response.data)
        : TMDBTVDetailsSchema.parse(response.data);
    },

    /**
     * Get movie or tv genres
     */
    async getGenres(type: MediaType, params?: TMDBGenresParams) {
      const response = await this.getClient().get(`/genre/${type}/list`, { params });
      return TMDBGenresResponseSchema.parse(response.data);
    },

    /**
     * Find content by external ID (TVDB, IMDB, etc.)
     * Returns movie_results and tv_results arrays
     */
    async findByExternalId(externalId: string | number, externalSource: 'tvdb_id' | 'imdb_id') {
      const response = await this.getClient().get(`/find/${externalId}`, {
        params: { external_source: externalSource },
      });
      return TMDBFindResponseSchema.parse(response.data);
    },
  };
}

export type TMDBClient = ReturnType<typeof createTMDBClient>;
