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
  REGION_GROUPS,
  type RegionGroupId,
} from '@findarr/shared';

interface TMDBService {
  searchMedia(params: SearchQuery): Promise<SearchResponse>;
  detailsMedia(params: DetailsQuery): Promise<MovieDetails | TVDetails>;
  discoverMedia(params: DiscoverQuery): Promise<SearchResponse>;
  getVideos(params: DetailsQuery): Promise<any>;
  getGenres(type: 'movie' | 'tv'): Promise<{ genres: Array<{ id: number; name: string }> }>;
}

// Cache for genres - loaded once at startup
const genreCache: {
  movie?: { genres: Array<{ id: number; name: string }> };
  tv?: { genres: Array<{ id: number; name: string }> };
} = {};

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

  // Load genres once at startup
  const loadGenres = async () => {
    try {
      fastify.log.info('Loading genres from TMDB...');
      const [movieGenres, tvGenres] = await Promise.all([
        client.get('/genre/movie/list', { params: { language: 'en-US' } }),
        client.get('/genre/tv/list', { params: { language: 'en-US' } }),
      ]);

      genreCache.movie = movieGenres.data;
      genreCache.tv = tvGenres.data;

      fastify.log.info(
        `Loaded ${movieGenres.data.genres.length} movie genres and ${tvGenres.data.genres.length} TV genres`
      );
    } catch (error) {
      fastify.log.error({ error }, 'Failed to load genres');
      throw error;
    }
  };

  await loadGenres();

  const tmdbService: TMDBService = {
    async searchMedia(params: SearchQuery) {
      const {
        query,
        type = 'both',
        page = 1,
        include_adult: includeAdult = false,
        language = 'en-US',
      } = params;

      // Extract region from language code (e.g., 'de-DE' -> 'DE')
      const region = language.includes('-') ? language.split('-')[1] : 'US';

      const searchEndpoint = (searchType: 'movie' | 'tv') =>
        client.get(`/search/${searchType}`, {
          params: { query, page, include_adult: includeAdult, language, region },
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

    async discoverMedia(params: DiscoverQuery) {
      const {
        type = 'both',
        page = 1,
        sort_by = 'popularity.desc',
        language = 'en-US',
        recent_period,
        tv_date_filter = 'air_date',
        region_groups = [], // Default to no filtering - show all content
        // Content filtering parameters
        vote_average_gte,
        vote_count_gte,
        ...otherParams
      } = params;

      // Extract region from language code (e.g., 'de-DE' -> 'DE')
      const region = language.includes('-') ? language.split('-')[1] : 'US';

      // Build language and country filters from selected region groups
      // region_groups now represents regions to INCLUDE (show)
      // If all regions are selected or none specified, don't apply filtering (show all)
      let languageFilter = '';
      let countryFilter = '';

      const allRegions = Object.keys(REGION_GROUPS) as RegionGroupId[];
      const isShowingAll = region_groups.length === 0 || region_groups.length === allRegions.length;

      if (!isShowingAll) {
        const includedLanguages = region_groups.flatMap(
          groupId => REGION_GROUPS[groupId as RegionGroupId].languages
        );
        const includedCountries = region_groups.flatMap(
          groupId => REGION_GROUPS[groupId as RegionGroupId].countries
        );

        languageFilter = includedLanguages.join('|');
        countryFilter = includedCountries.join('|');
      }

      let dateParams = {};
      if (recent_period) {
        const today = new Date();
        const futureDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000); // today + 1 week
        let pastDate: Date;

        switch (recent_period) {
          case 'last_week':
            pastDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'last_month':
            pastDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'last_3_months':
            pastDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          case 'last_6_months':
            pastDate = new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000);
            break;
          case 'last_year':
            pastDate = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
          case 'last_2_years':
            pastDate = new Date(today.getTime() - 730 * 24 * 60 * 60 * 1000);
            break;
          default:
            pastDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000); // default to last month
        }

        const formatDate = (date: Date) => date.toISOString().split('T')[0]; // YYYY-MM-DD

        // Apply appropriate date filters based on media type
        if (type === 'movie' || type === 'both') {
          dateParams = {
            ...dateParams,
            'primary_release_date.gte': formatDate(pastDate),
            'primary_release_date.lte': formatDate(futureDate),
          };
        }
        if (type === 'tv' || type === 'both') {
          // Use configurable date filter for TV shows
          if (tv_date_filter === 'first_air_date') {
            dateParams = {
              ...dateParams,
              'first_air_date.gte': formatDate(pastDate),
              'first_air_date.lte': formatDate(futureDate),
            };
          } else {
            dateParams = {
              ...dateParams,
              'air_date.gte': formatDate(pastDate),
              'air_date.lte': formatDate(futureDate),
            };
          }
        }
      }

      const discoverEndpoint = (discoverType: 'movie' | 'tv') => {
        const params = {
          page,
          sort_by,
          language,
          region,
          watch_region: region, // Focus on content available in the user's region
          ...(languageFilter && { with_original_language: languageFilter }),
          ...(countryFilter && { with_origin_country: countryFilter }),
          ...(vote_average_gte && { 'vote_average.gte': vote_average_gte }),
          ...(vote_count_gte && { 'vote_count.gte': vote_count_gte }),
          ...otherParams,
          ...dateParams,
        };

        return client.get(`/discover/${discoverType}`, { params });
      };
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
        if (sort_by.includes('vote_average')) {
          return (b.vote_average || 0) - (a.vote_average || 0);
        }
        if (sort_by.includes('vote_count')) {
          return (b.vote_count || 0) - (a.vote_count || 0);
        }
        return (b.popularity || 0) - (a.popularity || 0); // fallback to popularity
      });

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

      // Extract region from language code (e.g., 'de-DE' -> 'DE')
      const region = language.includes('-') ? language.split('-')[1] : 'US';

      // Fetch both details and videos in parallel
      const [detailsResponse, videosResponse] = await Promise.all([
        client.get(`/${type}/${id}`, {
          params: { language, region },
        }),
        client.get(`/${type}/${id}/videos`, {
          params: { language },
        }),
      ]);

      // Combine the results
      const details = detailsResponse.data;
      const videos = videosResponse.data;

      return {
        ...details,
        videos,
      };
    },

    async getVideos(params: DetailsQuery) {
      const { id, type, language = 'en-US' } = params;

      const response = await client.get(`/${type}/${id}/videos`, {
        params: { language },
      });
      return response.data;
    },

    async getGenres(type: 'movie' | 'tv') {
      // Return cached genres
      const cached = genreCache[type];
      if (!cached) {
        throw new Error(`Genres for ${type} not loaded`);
      }
      return cached;
    },
  };

  fastify.decorate('tmdb', tmdbService);
}

export default fp(tmdbPlugin, { name: 'tmdb' });
export { tmdbPlugin };
