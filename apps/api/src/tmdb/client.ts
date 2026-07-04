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
  const log = appLog.scope('tmdb');

  async function test(): Promise<boolean> {
    try {
      const auth = await client.get<{ success?: boolean }>('/authentication');
      return auth.data?.success ?? false;
    } catch (error) {
      log.warn({ err: error }, 'Connection test failed');
      return false;
    }
  }

  /** Search for movies or tv shows */
  async function search(type: MediaType, params: TMDBSearchParams | TMDBTVSearchParams) {
    const timer = log.timer('search', { type, params });

    const response = await client.get(`/search/${type}`, { params });
    const result = TMDBSearchResponseSchema.parse(response.data);

    timer.end();
    return result;
  }

  /**
   * Discover movies or tv shows with filters.
   * All TMDB discover parameters are supported - see TMDBDiscoverParams interface for full list.
   */
  async function discover(type: MediaType, params: Partial<TMDBDiscoverParams>) {
    const timer = log.timer('discover', { type, params });

    const response = await client.get(`/discover/${type}`, { params });
    const result = TMDBSearchResponseSchema.parse(response.data);

    timer.end();
    return result;
  }

  /** Get trending movies or shows */
  async function trending(type: MediaType, params: TMDBTrendingParams = {}) {
    const { time_window = 'week', page = 1, language } = params;
    const timer = log.timer('trending', { type, time_window, params });

    const response = await client.get(`/trending/${type}/${time_window}`, {
      params: { page, language },
    });
    const result = TMDBSearchResponseSchema.parse(response.data);

    timer.end();
    return result;
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
    const timer = log.timer('details', { type, id, params });

    const response = await client.get(`/${type}/${id}`, {
      params: { ...queryParams, append_to_response },
    });

    const result =
      type === 'movie'
        ? TMDBMovieDetailsSchema.parse(response.data)
        : TMDBTVDetailsSchema.parse(response.data);

    timer.end();
    return result;
  }

  /** Get movie or tv genres */
  async function genres(type: MediaType, params?: TMDBGenresParams) {
    const timer = log.timer('genres', { type, params });

    const response = await client.get(`/genre/${type}/list`, { params });
    const result = TMDBGenresResponseSchema.parse(response.data);

    timer.end();
    return result;
  }

  /**
   * Find content by external ID (TVDB, IMDB, etc.).
   * Returns movie_results and tv_results arrays.
   */
  async function findByExternalId(
    externalId: string | number,
    externalSource: 'tvdb_id' | 'imdb_id',
  ) {
    const timer = log.timer('findByExternalId', { externalId, externalSource });

    const response = await client.get(`/find/${externalId}`, {
      params: { external_source: externalSource },
    });
    const result = TMDBFindResponseSchema.parse(response.data);

    timer.end();
    return result;
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
