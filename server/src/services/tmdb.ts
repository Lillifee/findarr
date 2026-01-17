import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';
import axios, { type AxiosInstance } from 'axios';
import { MovieDetails, SearchResponse, TVDetails } from '@findarr/shared';

interface TMDBService {
  searchMovies(
    query: string,
    page?: number,
    includeAdult?: boolean,
    language?: string
  ): Promise<SearchResponse>;
  searchTV(
    query: string,
    page?: number,
    includeAdult?: boolean,
    language?: string
  ): Promise<SearchResponse>;
  getMovieDetails(id: number, language?: string): Promise<MovieDetails>;
  getTVDetails(id: number, language?: string): Promise<TVDetails>;
}

declare module 'fastify' {
  interface FastifyInstance {
    tmdb: TMDBService;
  }
}

async function tmdbPlugin(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  const client: AxiosInstance = axios.create({
    baseURL: process.env.TMDB_BASE_URL,
    headers: {
      Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  const tmdbService: TMDBService = {
    async searchMovies(query: string, page = 1, includeAdult = false, language = 'en-US') {
      const response = await client.get('/search/movie', {
        params: { query, page, include_adult: includeAdult, language },
      });
      return response.data;
    },

    async searchTV(query: string, page = 1, includeAdult = false, language = 'en-US') {
      const response = await client.get('/search/tv', {
        params: { query, page, include_adult: includeAdult, language },
      });
      return response.data;
    },

    async getMovieDetails(id: number, language = 'en-US') {
      const response = await client.get(`/movie/${id}`, {
        params: { language },
      });
      return response.data;
    },

    async getTVDetails(id: number, language = 'en-US') {
      const response = await client.get(`/tv/${id}`, {
        params: { language },
      });
      return response.data;
    },
  };

  fastify.decorate('tmdb', tmdbService);
}

export default fp(tmdbPlugin, { name: 'tmdb' });
export { tmdbPlugin };
