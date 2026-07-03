import type { MediaType } from '@findarr/shared/media';
import { create, type AxiosInstance } from 'axios';

import type { AppLogger } from '../utils/logger.js';
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

function createHttpClient(accessToken: string): AxiosInstance {
  return create({
    baseURL: 'https://api.themoviedb.org/3',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
}

export function createTMDBClient(accessToken: string, appLog: AppLogger) {
  const client = createHttpClient(accessToken);

  async function test(): Promise<boolean> {
    try {
      const auth = await client.get<{ success?: boolean }>('/authentication');
      return auth.data?.success ?? false;
    } catch (error) {
      appLog.warn({ name: 'tmdb', err: error }, 'Connection test failed');
      return false;
    }
  }

  /** Search for movies or tv shows */
  async function search(type: MediaType, params: TMDBSearchParams | TMDBTVSearchParams) {
    return appLog.debugTiming(
      async () => {
        const response = await client.get(`/search/${type}`, { params });
        return TMDBSearchResponseSchema.parse(response.data);
      },
      { name: 'tmdb', type, params },
      'tmdb search request',
    );
  }

  /**
   * Discover movies or tv shows with filters.
   * All TMDB discover parameters are supported - see TMDBDiscoverParams interface for full list.
   */
  async function discover(type: MediaType, params: Partial<TMDBDiscoverParams>) {
    return appLog.debugTiming(
      async () => {
        const response = await client.get(`/discover/${type}`, { params });
        return TMDBSearchResponseSchema.parse(response.data);
      },
      { name: 'tmdb', type, params },
      'tmdb discover request',
    );
  }

  /** Get trending movies or shows */
  async function trending(type: MediaType, params: TMDBTrendingParams = {}) {
    const { time_window = 'week', page = 1, language } = params;
    return appLog.debugTiming(
      async () => {
        const response = await client.get(`/trending/${type}/${time_window}`, {
          params: { page, language },
        });
        return TMDBSearchResponseSchema.parse(response.data);
      },
      { name: 'tmdb', type, time_window, params },
      'tmdb trending request',
    );
  }

  /**
   * Get movie or tv details.
   * Use append_to_response to fetch related data in a single call (e.g., 'credits,videos,images').
   * By default, fetches credits, keywords, external_ids, videos for rich media details.
   */
  async function details(type: MediaType, params: TMDBDetailsParams) {
    const {
      id,
      append_to_response = 'credits,keywords,external_ids,videos',
      ...queryParams
    } = params;
    return appLog.debugTiming(
      async () => {
        const response = await client.get(`/${type}/${id}`, {
          params: { ...queryParams, append_to_response },
        });

        return type === 'movie'
          ? TMDBMovieDetailsSchema.parse(response.data)
          : TMDBTVDetailsSchema.parse(response.data);
      },
      { name: 'tmdb', type, id, params },
      'tmdb details request',
    );
  }

  /** Get movie or tv genres */
  async function genres(type: MediaType, params?: TMDBGenresParams) {
    const response = await client.get(`/genre/${type}/list`, { params });
    return TMDBGenresResponseSchema.parse(response.data);
  }

  /**
   * Find content by external ID (TVDB, IMDB, etc.).
   * Returns movie_results and tv_results arrays.
   */
  async function findByExternalId(
    externalId: string | number,
    externalSource: 'tvdb_id' | 'imdb_id',
  ) {
    const response = await client.get(`/find/${externalId}`, {
      params: { external_source: externalSource },
    });
    return TMDBFindResponseSchema.parse(response.data);
  }

  return {
    testConnection: test,
    search,
    discover,
    trending,
    details,
    genres,
    findByExternalId,
  };
}

export type TMDBClient = ReturnType<typeof createTMDBClient>;
