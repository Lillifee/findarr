import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';
import axios, { type AxiosInstance } from 'axios';
import {
  MovieDetails,
  SearchResponse,
  TVDetails,
  SearchQuery,
  DiscoverQuery,
  DetailsQuery,
} from '@findarr/shared';

interface TMDBService {
  searchMedia(params: SearchQuery): Promise<SearchResponse>;
  detailsMedia(params: DetailsQuery): Promise<MovieDetails | TVDetails>;
  discoverMedia(params: DiscoverQuery): Promise<SearchResponse>;
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
    async searchMedia(params: SearchQuery) {
      const {
        query,
        type = 'both',
        page = 1,
        include_adult: includeAdult = false,
        language = 'en-US',
      } = params;
      const searchEndpoint = (searchType: 'movie' | 'tv') =>
        client.get(`/search/${searchType}`, {
          params: { query, page, include_adult: includeAdult, language },
        });

      // Collect promises based on search type
      const searchTypes = type === 'both' ? (['movie', 'tv'] as const) : ([type] as const);
      const promises = searchTypes.map(searchType => searchEndpoint(searchType));

      const responses = await Promise.all(promises);

      // Extract and sort results from all responses
      const allResults = responses.flatMap(response => response.data.results);
      const sortedResults = allResults.sort((a, b) => b.popularity - a.popularity);

      // Calculate totals
      const totalPages = Math.max(...responses.map(response => response.data.total_pages));
      const totalResults = responses.reduce(
        (sum, response) => sum + response.data.total_results,
        0
      );

      return {
        page,
        results: sortedResults,
        total_pages: totalPages,
        total_results: totalResults,
      };
    },

    async detailsMedia(params: DetailsQuery) {
      const { id, type, language = 'en-US' } = params;
      const response = await client.get(`/${type}/${id}`, {
        params: { language },
      });
      return response.data;
    },

    async discoverMedia(params: DiscoverQuery) {
      const {
        type = 'both',
        page = 1,
        sort_by = 'popularity.desc',
        language = 'en-US',
        ...otherParams
      } = params;

      const discoverEndpoint = (discoverType: 'movie' | 'tv') =>
        client.get(`/discover/${discoverType}`, {
          params: { page, sort_by, language, ...otherParams },
        });

      // Collect promises based on discover type
      const discoverTypes = type === 'both' ? (['movie', 'tv'] as const) : ([type] as const);
      const promises = discoverTypes.map(discoverType => discoverEndpoint(discoverType));

      const responses = await Promise.all(promises);

      // Extract and sort results from all responses
      const allResults = responses.flatMap(response =>
        response.data.results.map((item: Record<string, unknown>) => ({
          ...item,
          media_type: response.config.url?.includes('/discover/movie') ? 'movie' : 'tv',
        }))
      );
      const sortedResults = allResults.sort((a, b) => {
        if (sort_by.includes('popularity')) {
          return (b.popularity || 0) - (a.popularity || 0);
        }
        return (b.vote_average || 0) - (a.vote_average || 0);
      });

      // Calculate totals
      const totalPages = Math.max(...responses.map(response => response.data.total_pages));
      const totalResults = responses.reduce(
        (sum, response) => sum + response.data.total_results,
        0
      );

      return {
        page,
        results: type === 'both' ? sortedResults.slice(0, 20) : sortedResults,
        total_pages: totalPages,
        total_results: totalResults,
      };
    },
  };

  fastify.decorate('tmdb', tmdbService);
}

export default fp(tmdbPlugin, { name: 'tmdb' });
export { tmdbPlugin };
