import type { SearchQuery, DiscoverQuery, DetailsQuery } from '@findarr/shared/catalog';
import type {
  Genre,
  MediaDetails,
  MediaType,
  Media,
  PaginatedMediaResponse,
  Person,
  Keyword,
} from '@findarr/shared/media';
import type { TmdbSettings, TmdbSettingsQuery } from '@findarr/shared/settings';
import { isDefined } from '@findarr/shared/utils';

import type { Database } from '../db/service.js';
import type { SchedulerService } from '../scheduler/service.js';
import type { SettingsService } from '../settings/service.js';
import { createLruTtlCache } from '../utils/cacheHelper.js';
import { createClientLifecycle } from '../utils/clientLifecycleHelper.js';
import type { AppLogger } from '../utils/logger.js';
import { createTMDBClient, type TMDBClient } from './client.js';
import { buildDateParams } from './helpers.js';
import { getTmdbSettingsFull, setTmdbSettings, type TmdbSettingsFull } from './repository.js';
import type { TMDBDiscoverParams, TMDBTrendingParams } from './schemas.js';
import { transformMedia, transformDetails, transformPerson } from './transformers.js';

const MEDIA_TYPES = ['movie', 'tv'] as const;

function createPageRange(length: number) {
  return Array.from({ length }).map((_, i) => i + 1);
}

export interface TmdbServiceContext {
  db: Database;
  appLog: AppLogger;
  scheduler: SchedulerService;
  settings: SettingsService;
}

export interface TmdbBaseParams {
  language?: string;
}

interface TmdbGenresParams extends TmdbBaseParams {
  query?: string;
}

/**
 * TMDB Service - handles data fetching from TMDB API
 * Pure data operations without business logic or caching
 */
export async function createTMDBService(context: TmdbServiceContext) {
  const genreCache = createLruTtlCache<Map<number, Genre>>(24 * 60 * 60 * 1000, 20);
  const detailsCache = createLruTtlCache<MediaDetails>(60_000, 500);

  const lifecycle = createClientLifecycle<TmdbSettingsFull, TMDBClient>({
    name: 'TMDB',
    loadSettings: async () => getTmdbSettingsFull(context.settings),
    createClient: (settings) =>
      isDefined(settings.tmdbAccessToken)
        ? createTMDBClient(settings.tmdbAccessToken, context.appLog)
        : undefined,
  });

  async function getGenreMap(language = 'en-US'): Promise<Map<number, Genre>> {
    return genreCache.getOrLoad(language, async () => {
      const client = lifecycle.client();

      const [movieGenres, tvGenres] = await Promise.all([
        client.genres('movie', { language }),
        client.genres('tv', { language }),
      ]);
      const genreMap = new Map<number, Genre>();

      for (const genre of [...movieGenres.genres, ...tvGenres.genres]) {
        genreMap.set(genre.id, genre);
      }

      return genreMap;
    });
  }

  async function reloadService(): Promise<void> {
    await lifecycle.reload();
    genreCache.clear();

    if (lifecycle.isConfigured()) {
      await getGenreMap();
    }
  }

  await reloadService().catch((error: unknown) => {
    context.appLog.scope('tmdb').error({ error }, 'Failed to initialize TMDB service');
  });

  function getSettings(): TmdbSettings {
    const { tmdbAccessToken: _tmdbAccessToken, ...settings } = lifecycle.settings();
    return settings;
  }

  async function setSettings(settings: TmdbSettingsQuery): Promise<TmdbSettings> {
    await setTmdbSettings(context.settings, settings);

    await reloadService();
    return getSettings();
  }

  async function testConnection(): Promise<boolean> {
    return lifecycle.isConfigured() && (await lifecycle.client().testConnection());
  }

  async function testAndSync(): Promise<boolean> {
    return (
      (await testConnection()) &&
      (await context.scheduler.trigger({ name: 'catalogCacheSync' }), true)
    );
  }

  function isConfigured(): boolean {
    return lifecycle.isConfigured();
  }

  /**
   * Fetch discover results from TMDB
   * Fetches specified pages and transforms to application format
   */
  async function discover(params: {
    pages: number;
    recentDays: number;
    tmdbParams?: TMDBDiscoverParams;
  }): Promise<Media[]> {
    const client = lifecycle.client();
    const { recentDays, pages, tmdbParams } = params;
    const pagesToFetch = createPageRange(pages);
    const genreMap = await getGenreMap('en-US');

    const responses = await Promise.all(
      MEDIA_TYPES.flatMap((discoverType) =>
        pagesToFetch.map(async (page) =>
          client.discover(discoverType, {
            page,
            ...buildDateParams(discoverType, recentDays),
            ...tmdbParams,
          }),
        ),
      ),
    );

    const results = responses.flatMap((response) =>
      response.results.map((item) => transformMedia(item, genreMap)),
    );

    return results;
  }

  /**
   * Fetch trending results from TMDB
   * Fetches specified pages and transforms to application format
   */
  async function trending(params: {
    pages: number;
    tmdbParams: TMDBTrendingParams;
  }): Promise<Media[]> {
    const client = lifecycle.client();
    const { pages, tmdbParams } = params;
    const pagesToFetch = createPageRange(pages);
    const genreMap = await getGenreMap();

    const ranks: Record<MediaType, number> = { movie: 0, tv: 0 };

    const responses = await Promise.all(
      MEDIA_TYPES.flatMap((type) =>
        pagesToFetch.map(async (page) => client.trending(type, { ...tmdbParams, page })),
      ),
    );

    const results = responses.flatMap(({ results: res }) =>
      res.map((item) => {
        const { type } = item;
        const trendingRank = ranks[type] + 1;
        ranks[type] = trendingRank;

        return transformMedia(item, genreMap, { trendingRank });
      }),
    );

    return results;
  }

  async function searchMedia(
    params: SearchQuery & TmdbBaseParams,
  ): Promise<PaginatedMediaResponse> {
    const { query, type, page, language = 'en-US' } = params;
    const region = language.split('-')[1] ?? 'US';
    const client = lifecycle.client();
    const genreMap = await getGenreMap(language);

    const searchTypes = type === 'both' ? MEDIA_TYPES : [type];
    const mediaResponses = await Promise.all(
      searchTypes.map(async (searchType) =>
        client.searchMedia(searchType, { query, page, language, region }),
      ),
    );

    const allResults = mediaResponses.flatMap((response) =>
      response.results.map((item) => transformMedia(item, genreMap)),
    );
    const results = allResults.toSorted((a, b) => b.popularity - a.popularity);

    return {
      page,
      results,
    };
  }

  async function searchPeople(params: SearchQuery & TmdbBaseParams): Promise<Person[]> {
    const { query, page, language = 'en-US' } = params;
    const region = language.split('-')[1] ?? 'US';
    const response = await lifecycle.client().searchPeople({ query, page, language, region });

    return response.results.map(transformPerson);
  }

  async function searchKeywords(params: SearchQuery & TmdbBaseParams): Promise<Keyword[]> {
    const { query, page, language = 'en-US' } = params;
    const response = await lifecycle.client().searchKeywords({ query, page, language });

    return response.results;
  }

  async function discoverMedia(
    params: DiscoverQuery & TmdbBaseParams,
  ): Promise<PaginatedMediaResponse> {
    const { page, type, language = 'en-US' } = params;
    const mediaTypes = type === 'both' ? MEDIA_TYPES : [type];
    const genreMap = await getGenreMap(language);

    const tmdbParams = {
      ...(params.discoverType === 'person' ? { with_people: String(params.discoverId) } : {}),
      ...(params.discoverType === 'keyword' ? { with_keywords: String(params.discoverId) } : {}),
      ...(params.discoverType === 'genre' ? { with_genres: String(params.discoverId) } : {}),
    };

    const responses = await Promise.all(
      mediaTypes.map(async (mediaType) =>
        lifecycle.client().discover(mediaType, { page, language, ...tmdbParams }),
      ),
    );

    return {
      page,
      results: responses
        .flatMap((response) => response.results.map((item) => transformMedia(item, genreMap)))
        .toSorted((left, right) => right.popularity - left.popularity),
    };
  }

  /**
   * Get movie or TV show details
   */
  async function details(params: DetailsQuery & TmdbBaseParams): Promise<MediaDetails> {
    const { id, type, language = 'en-US' } = params;

    return detailsCache.getOrLoad(`${id}:${type}:${language}`, async () => {
      const tmdbMovie = await lifecycle.client().details(type, { id, language });
      const genreMap = await getGenreMap(language);
      return transformDetails(tmdbMovie, genreMap);
    });
  }

  /**
   * Get all genres.
   * Returns from the in-memory map populated during configure — params are not used.
   */
  async function searchGenres(params: TmdbGenresParams): Promise<Genre[]> {
    const genreMap = await getGenreMap(params.language);
    const allGenres = [...genreMap.values()];

    if (!isDefined(params.query)) {
      return allGenres;
    }

    const normalizedQuery = params.query.toLocaleLowerCase();
    return allGenres.filter((genre) => genre.name.toLocaleLowerCase().includes(normalizedQuery));
  }

  /**
   * Find content by external tvdbId
   * Returns TMDB ID for content matching the external ID
   */
  async function findByExternalId(type: MediaType, tvdbId: number): Promise<number | undefined> {
    const result = await lifecycle.client().findByExternalId(tvdbId, 'tvdb_id');
    return type === 'movie' ? result.movie_results?.[0]?.id : result.tv_results?.[0]?.id;
  }

  return {
    getSettings,
    setSettings,
    isConfigured,
    testConnection,
    testAndSync,
    searchMedia,
    searchPeople,
    searchKeywords,
    discoverMedia,
    discover,
    trending,
    details,
    searchGenres,
    findByExternalId,
  };
}

export type TMDBService = Awaited<ReturnType<typeof createTMDBService>>;
