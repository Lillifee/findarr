import type { SearchQuery, DetailsQuery, GenresQuery } from '@findarr/shared/catalog';
import type { SearchResponse, Genre, MediaDetails, MediaType, Media } from '@findarr/shared/media';
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
import { transformMedia, transformDetails } from './transformers.js';

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

/**
 * TMDB Service - handles data fetching from TMDB API
 * Pure data operations without business logic or caching
 */
export async function createTMDBService(context: TmdbServiceContext) {
  const genreMap = new Map<number, Genre>();
  const detailsCache = createLruTtlCache<MediaDetails>(60_000, 500);

  const lifecycle = createClientLifecycle<TmdbSettingsFull, TMDBClient>({
    name: 'TMDB',
    loadSettings: async () => getTmdbSettingsFull(context.settings),
    createClient: (settings) =>
      isDefined(settings.tmdbAccessToken)
        ? createTMDBClient(settings.tmdbAccessToken, context.appLog)
        : undefined,
  });

  async function loadGenres(client: TMDBClient): Promise<void> {
    const [movieGenres, tvGenres] = await Promise.all([
      client.genres('movie', { language: 'en-US' }),
      client.genres('tv', { language: 'en-US' }),
    ]);

    genreMap.clear();

    for (const genre of [...movieGenres.genres, ...tvGenres.genres]) {
      genreMap.set(genre.id, genre);
    }
  }

  async function ensureGenresLoaded(client?: TMDBClient): Promise<void> {
    if (genreMap.size > 0) {
      return;
    }
    await loadGenres(client ?? lifecycle.client());
  }

  async function reloadService(): Promise<void> {
    await lifecycle.reload();

    if (lifecycle.isConfigured()) {
      await ensureGenresLoaded();
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

  /**
   * Search for movies and TV shows
   */
  async function search(params: SearchQuery & TmdbBaseParams): Promise<SearchResponse> {
    const { query, type, page, language = 'en-US' } = params;
    const region = language.split('-')[1] ?? 'US';
    const client = lifecycle.client();

    const searchTypes = type === 'both' ? MEDIA_TYPES : [type];
    const promises = searchTypes.map(async (searchType) =>
      client.search(searchType, { query, page, language, region }),
    );

    const searchResponses = await Promise.all(promises);

    const allResults = searchResponses.flatMap((response) =>
      response.results.map((item) => transformMedia(item, genreMap)),
    );

    const sortedResults = allResults.toSorted((a, b) => b.popularity - a.popularity);

    return {
      page,
      results: sortedResults,
    };
  }

  /**
   * Get movie or TV show details
   */
  async function details(params: DetailsQuery & TmdbBaseParams): Promise<MediaDetails> {
    const { id, type, language = 'en-US' } = params;

    return detailsCache.getOrLoad(`${id}:${type}:${language}`, async () => {
      const tmdbMovie = await lifecycle.client().details(type, { id, language });
      return transformDetails(tmdbMovie);
    });
  }

  /**
   * Get all genres.
   * Returns from the in-memory map populated during configure — params are not used.
   */
  async function genres(_params: GenresQuery): Promise<Genre[]> {
    await ensureGenresLoaded();
    const allGenres = [...genreMap.values()];
    return allGenres;
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
    search,
    discover,
    trending,
    details,
    genres,
    findByExternalId,
  };
}

export type TMDBService = Awaited<ReturnType<typeof createTMDBService>>;
