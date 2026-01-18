import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';
import axios, { type AxiosInstance } from 'axios';
import { MovieDetails, SearchResponse, TVDetails, SearchType } from '@findarr/shared';

interface TMDBService {
  searchMedia(
    query: string,
    type?: SearchType,
    page?: number,
    includeAdult?: boolean,
    language?: string
  ): Promise<SearchResponse>;
  getMediaDetails(
    id: number,
    type: 'movie' | 'tv',
    language?: string
  ): Promise<MovieDetails | TVDetails>;
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
    async searchMedia(
      query: string,
      type: SearchType = 'both',
      page = 1,
      includeAdult = false,
      language = 'en-US'
    ) {
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

    async getMediaDetails(id: number, type: 'movie' | 'tv', language = 'en-US') {
      const response = await client.get(`/${type}/${id}`, {
        params: { language },
      });
      return response.data;
    },
  };

  fastify.decorate('tmdb', tmdbService);
}

export default fp(tmdbPlugin, { name: 'tmdb' });
export { tmdbPlugin };
