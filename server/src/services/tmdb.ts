import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';
import axios, { type AxiosInstance } from 'axios';
import {
  SearchResponse,
  SearchQuery,
  DiscoverQuery,
  DetailsQuery,
  REGION_GROUPS,
  type RegionGroupId,
  VideosResponse,
  GenresQuery,
  GenresResponse,
  VideosQuery,
  DiscoverResponse,
  DetailsResponse,
  TMDBSearchResponseSchema,
  TMDBMovieDetailsSchema,
  TMDBTVDetailsSchema,
  TMDBVideosResponseSchema,
  TMDBGenresResponseSchema,
  MovieOrTVShow,
} from '@findarr/shared';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate date range from days back
 */
function getDateRangeFromDays(days: number): { pastDate: Date; futureDate: Date } {
  const today = new Date();
  const futureDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000); // today + 1 week
  const pastDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);

  return { pastDate, futureDate };
}

/**
 * Build region filters from selected region groups
 */
function buildRegionFilters(regionGroups: RegionGroupId[]): {
  languageFilter: string;
  countryFilter: string;
} {
  const allRegions = Object.keys(REGION_GROUPS) as RegionGroupId[];
  const isShowingAll = regionGroups.length === 0 || regionGroups.length === allRegions.length;

  if (isShowingAll) {
    return { languageFilter: '', countryFilter: '' };
  }

  const includedLanguages = regionGroups.flatMap(groupId => REGION_GROUPS[groupId].languages);
  const includedCountries = regionGroups.flatMap(groupId => REGION_GROUPS[groupId].countries);

  return {
    languageFilter: includedLanguages.join('|'),
    countryFilter: includedCountries.join('|'),
  };
}

/**
 * Build date parameters for discover queries
 */
function buildDateParams(
  recentDays: number | undefined,
  type: 'movie' | 'tv' | 'both'
): Record<string, string> {
  if (!recentDays) return {};

  const { pastDate, futureDate } = getDateRangeFromDays(recentDays);
  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const dateParams: Record<string, string> = {};

  if (type === 'movie' || type === 'both') {
    dateParams['primary_release_date.gte'] = formatDate(pastDate);
    dateParams['primary_release_date.lte'] = formatDate(futureDate);
  }

  if (type === 'tv' || type === 'both') {
    dateParams['air_date.gte'] = formatDate(pastDate);
    dateParams['air_date.lte'] = formatDate(futureDate);
  }

  return dateParams;
}

/**
 * Filter trending items by discover criteria
 */
function filterTrendingItem(
  item: MovieOrTVShow,
  filters: {
    type: 'movie' | 'tv' | 'both';
    languageFilter: string;
    countryFilter: string;
    genresFilter?: string;
  }
): boolean {
  // Media type filter
  if (filters.type !== 'both' && item.media_type !== filters.type) {
    return false;
  }

  // Language filter
  if (
    filters.languageFilter &&
    !filters.languageFilter.split('|').includes(item.original_language)
  ) {
    return false;
  }

  // Country filter
  if (filters.countryFilter && item.origin_country) {
    const itemCountries = Array.isArray(item.origin_country)
      ? item.origin_country
      : [item.origin_country];
    const allowedCountries = filters.countryFilter.split('|');
    if (!itemCountries.some(country => allowedCountries.includes(country))) {
      return false;
    }
  }

  // Genre filter
  if (filters.genresFilter && item.genre_ids) {
    const selectedGenres = filters.genresFilter.split(',').map(Number);
    const itemGenres = Array.isArray(item.genre_ids) ? item.genre_ids : [];
    if (!selectedGenres.some(genreId => itemGenres.includes(genreId))) {
      return false;
    }
  }

  return true;
}

/**
 * Calculate custom popularity score for an item
 */
function calculateCustomPopularity(
  item: MovieOrTVShow,
  trendingRank?: number,
  trendingBoost?: number
): number {
  const basePop = item.popularity || 0;
  const voteAverage = item.vote_average || 0;
  const voteCount = item.vote_count || 0;

  let customPopularity = basePop;

  // Apply trending boost
  if (trendingRank !== undefined && trendingBoost !== undefined) {
    customPopularity += trendingBoost;

    if (trendingRank <= 10) customPopularity += 200;
    if (trendingRank <= 5) customPopularity += 150;
    if (trendingRank === 1) customPopularity += 200;
  }

  // Apply vote-based quality boost
  if (voteCount > 0 && voteAverage > 0) {
    const qualityBoost = Math.max(0, (voteAverage - 6) * 10);

    let ageAdjustedVoteCount = voteCount;
    let agePenalty = 0;
    let recencyBoost = 0;

    if (item.date) {
      const releaseYear = new Date(item.date).getFullYear();
      const currentYear = new Date().getFullYear();
      const ageInYears = Math.max(1, currentYear - releaseYear);

      // Age-adjusted vote count
      ageAdjustedVoteCount = voteCount / Math.sqrt(ageInYears);

      // Age penalties
      if (ageInYears >= 8) {
        const ageFactor = Math.min(ageInYears - 7, 35);
        agePenalty = Math.pow(1.4, ageFactor) - 1;
      }
      if (ageInYears >= 15) agePenalty += 100;
      if (ageInYears >= 20) agePenalty += 200;
      if (ageInYears >= 30) agePenalty += 400;

      // Recency boosts
      if (ageInYears <= 5) {
        const recencyMap = [30, 25, 20, 15, 10, 5];
        recencyBoost = recencyMap[ageInYears] || 0;
      }
    }

    const volumeBoost = Math.min(15, Math.log10(ageAdjustedVoteCount + 1) * 6);
    let voteBoost = qualityBoost + volumeBoost;

    const exceptionalBoost = voteAverage >= 8.5 && ageAdjustedVoteCount >= 500 ? 10 : 0;
    voteBoost = Math.min(50, voteBoost + exceptionalBoost);

    customPopularity += voteBoost + recencyBoost - agePenalty;
  }

  return customPopularity;
}

/**
 * Remove duplicate items, preferring trending versions
 */
function deduplicateResults(results: MovieOrTVShow[]): MovieOrTVShow[] {
  return results.reduce<MovieOrTVShow[]>((acc, item) => {
    const existing = acc.find(u => u.id === item.id);
    if (!existing) {
      acc.push(item);
    } else if (item.is_trending && !existing.is_trending) {
      const index = acc.indexOf(existing);
      acc[index] = item;
    }
    return acc;
  }, []);
}

interface TMDBService {
  search(params: SearchQuery): Promise<SearchResponse>;
  discover(params: DiscoverQuery): Promise<DiscoverResponse>;
  getDetails(params: DetailsQuery): Promise<DetailsResponse>;
  getVideos(params: VideosQuery): Promise<VideosResponse>;
  getGenres(params: GenresQuery): Promise<GenresResponse>;
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

      genreCache.movie = TMDBGenresResponseSchema.parse(movieGenres.data);
      genreCache.tv = TMDBGenresResponseSchema.parse(tvGenres.data);

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
    async search(params: SearchQuery) {
      const { query, type = 'both', page = 1, language = 'en-US' } = params;

      // Extract region from language code (e.g., 'de-DE' -> 'DE')
      const region = language.includes('-') ? language.split('-')[1] : 'US';

      const searchEndpoint = (searchType: 'movie' | 'tv') =>
        client.get(`/search/${searchType}`, {
          params: { query, page, include_adult: false, language, region },
        });

      // Collect promises based on search type
      const searchTypes = type === 'both' ? (['movie', 'tv'] as const) : ([type] as const);
      const promises = searchTypes.map(searchType => searchEndpoint(searchType));

      const searchResponses = await Promise.all(promises);

      // Validate all search responses
      const validatedResponses = searchResponses.map(response =>
        TMDBSearchResponseSchema.parse(response.data)
      );

      // Extract and sort results from all responses, adding trending indicators
      const allResults = validatedResponses.flatMap(response => response.results);

      const sortedResults = allResults.sort((a, b) => {
        return b.popularity - a.popularity;
      });

      // Calculate totals
      const totalPages = Math.max(...validatedResponses.map(response => response.total_pages));
      const totalResults = validatedResponses.reduce(
        (sum, response) => sum + response.total_results,
        0
      );

      return {
        page,
        results: sortedResults,
        total_pages: totalPages,
        total_results: totalResults,
      };
    },

    async discover(params: DiscoverQuery) {
      const {
        type = 'both',
        language = 'en-US',
        recent_days,
        region_groups = [],
        vote_average_gte,
        vote_count_gte,
        ...otherParams
      } = params;

      const region = language.includes('-') ? language.split('-')[1] : 'US';

      // Build filters
      const { languageFilter, countryFilter } = buildRegionFilters(region_groups);

      const dateParams = buildDateParams(recent_days, type);

      // Fetch discover and trending data
      const discoverTypes = type === 'both' ? (['movie', 'tv'] as const) : ([type] as const);

      const discoverPromises = discoverTypes.flatMap(discoverType =>
        [1, 2, 3, 4, 5].map(page =>
          client.get(`/discover/${discoverType}`, {
            params: {
              page,
              sort_by: 'popularity.desc',
              language,
              region,
              watch_region: region,
              ...(languageFilter && { with_original_language: languageFilter }),
              ...(countryFilter && { with_origin_country: countryFilter }),
              ...(vote_average_gte && { 'vote_average.gte': vote_average_gte }),
              ...(vote_count_gte && { 'vote_count.gte': vote_count_gte }),
              ...otherParams,
              ...dateParams,
            },
          })
        )
      );

      const trendingPromises = discoverTypes.flatMap(discoverType =>
        [1, 2, 3].map(page => client.get(`/trending/${discoverType}/week`, { params: { page } }))
      );

      const [discoverResponses, trendingResponses] = await Promise.all([
        Promise.all(discoverPromises),
        Promise.all(trendingPromises),
      ]);

      // Process trending items
      const trendingResults = trendingResponses
        .map(response => TMDBSearchResponseSchema.parse(response.data))
        .flatMap(response => response.results)
        .map(item => ({ ...item, is_trending: true }))
        .filter(x =>
          filterTrendingItem(x, {
            type,
            languageFilter,
            countryFilter,
            genresFilter: otherParams.with_genres?.toString(),
          })
        );

      // Extract regular discover results and preserve TMDB's sorting
      const discoverResults = discoverResponses
        .map(response => TMDBSearchResponseSchema.parse(response.data))
        .flatMap<MovieOrTVShow>((response, index) =>
          response.results.map(item => ({
            ...item,
            media_type: discoverResponses[index].config.url?.includes('/discover/movie')
              ? 'movie'
              : 'tv',
            is_trending: false,
          }))
        );

      // Create trending score map
      const trendingScoreMap = new Map<number, { trending_boost: number; trending_rank: number }>();
      trendingResults.forEach((item, index) => {
        const trendingBoost = Math.max(0, 500 - index * 10);
        trendingScoreMap.set(item.id, {
          trending_boost: trendingBoost,
          trending_rank: index + 1,
        });
      });

      // Apply custom scoring
      const allResultsWithScoring = [...trendingResults, ...discoverResults].map(item => {
        const trendingData = trendingScoreMap.get(item.id);
        const customPopularity = calculateCustomPopularity(
          item,
          trendingData?.trending_rank,
          trendingData?.trending_boost
        );

        return {
          ...item,
          custom_popularity: customPopularity,
          is_trending: !!trendingData,
          trending_rank: trendingData?.trending_rank,
          trending_boost: trendingData?.trending_boost || 0,
        };
      });

      // Remove duplicates and sort
      const uniqueResults = deduplicateResults(allResultsWithScoring);
      const sortedResults = uniqueResults.sort(
        (a, b) => (b.custom_popularity || 0) - (a.custom_popularity || 0)
      );

      return { results: sortedResults };
    },

    async getDetails(params: DetailsQuery) {
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

      // Validate and combine the results
      const detailsSchema = type === 'movie' ? TMDBMovieDetailsSchema : TMDBTVDetailsSchema;
      const details = detailsSchema.parse(detailsResponse.data);
      const videos = TMDBVideosResponseSchema.parse(videosResponse.data);

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
      return TMDBVideosResponseSchema.parse(response.data);
    },

    async getGenres(params: GenresQuery) {
      // Return cached genres
      const cached = genreCache[params.type];
      if (!cached) {
        throw new Error(`Genres for ${params.type} not loaded`);
      }
      return cached;
    },
  };

  fastify.decorate('tmdb', tmdbService);
}

export default fp(tmdbPlugin, { name: 'tmdb' });
export { tmdbPlugin };
