import type {
  SearchQuery,
  DetailsQuery,
  GenresQuery,
  SearchResponse,
  Genre,
  DiscoverResponse,
  MediaDetails,
  DiscoverQuery,
  UserSettingsQuery,
  MediaType,
  TmdbSettings,
  TmdbSettingsQuery,
} from '@findarr/shared';
import type { DB } from '../db/setup.js';
import { createTMDBClient, type TMDBClient } from './client.js';
import { buildDiscoverParams } from './helpers.js';
import { getTmdbSettingsFull, setTmdbSettings, type TmdbSettingsFull } from './repository.js';
import type { TMDBTrendingParams } from './schemas.js';
import { transformMedia, transformDetails } from './transformers.js';

const MEDIA_TYPES = ['movie', 'tv'] as const;

type RuntimeState = {
  settings?: TmdbSettingsFull;
  client?: TMDBClient | undefined;
};

/**
 * TMDB Service - handles data fetching from TMDB API
 * Pure data operations without business logic or caching
 */
export async function createTMDBService(db: DB) {
  let state: RuntimeState = {};
  let reloadPromise: Promise<void> | undefined;
  const genreMap = new Map<number, Genre>();

  await reload();

  async function reload(): Promise<void> {
    await reloadClient();
    await ensureGenresLoaded();
  }

  async function reloadClient(): Promise<void> {
    if (reloadPromise) return reloadPromise;

    reloadPromise = (async () => {
      const settings = await getTmdbSettingsFull(db);
      const client = settings.tmdbAccessToken
        ? createTMDBClient(settings.tmdbAccessToken)
        : undefined;

      state = { settings, client };
    })();

    try {
      await reloadPromise;
    } finally {
      reloadPromise = undefined;
    }
  }

  function requireClient(): TMDBClient {
    if (!state.client) throw new Error('TMDB client is not configured');
    return state.client;
  }

  function requireSettings(): TmdbSettingsFull {
    if (!state.settings) throw new Error('TMDB settings are unavailable');
    return state.settings;
  }

  function getSettings(): TmdbSettings {
    const { tmdbAccessToken: _tmdbAccessToken, ...settings } = requireSettings();
    return settings;
  }

  async function setSettings(settings: TmdbSettingsQuery): Promise<TmdbSettings> {
    await setTmdbSettings(db, settings);

    await reload();
    return getSettings();
  }

  async function testConnection(): Promise<boolean> {
    return state.client ? await state.client.testConnection() : false;
  }

  async function isConfigured(): Promise<boolean> {
    return !!state.client;
  }

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
    if (genreMap.size > 0) return;
    await loadGenres(client ?? requireClient());
  }

  /**
   * Search for movies and TV shows
   */
  async function search(params: SearchQuery): Promise<SearchResponse> {
    const { query, type = 'both', page = 1, language = 'en-US' } = params;
    const region = language.split('-')[1] || 'US';
    const client = requireClient();

    const searchTypes = type === 'both' ? MEDIA_TYPES : [type];
    const promises = searchTypes.map(searchType =>
      client.search(searchType, { query, page, language, region })
    );

    const searchResponses = await Promise.all(promises);

    const allResults = searchResponses.flatMap(response =>
      response.results.map(item => transformMedia(item, genreMap))
    );

    const sortedResults = allResults.sort((a, b) => b.popularity - a.popularity);
    const totalPages = Math.max(...searchResponses.map(response => response.total_pages));

    return {
      page,
      results: sortedResults,
      totalPages,
    };
  }

  /**
   * Fetch discover results from TMDB
   * Fetches specified pages and transforms to application format
   */
  async function discover(
    params: DiscoverQuery & UserSettingsQuery,
    pages?: number[]
  ): Promise<DiscoverResponse> {
    const { type = 'both', page = 1 } = params;
    const client = requireClient();

    const discoverTypes = type === 'both' ? MEDIA_TYPES : [type];
    const pagesToFetch = pages ?? [page];

    const discoverParams = buildDiscoverParams(params);
    const discoverPromises = discoverTypes.flatMap(discoverType =>
      pagesToFetch.map(pageNum =>
        client.discover(discoverType, { ...discoverParams, page: pageNum })
      )
    );

    const responses = await Promise.all(discoverPromises);

    const results = responses.flatMap(response =>
      response.results.map(item => transformMedia(item, genreMap))
    );

    // Aggregate pagination metadata (max of both types)
    const totalPages = Math.max(...responses.map(r => r.total_pages));

    return { results, page, totalPages };
  }

  /**
   * Fetch trending results from TMDB
   * Fetches specified pages and transforms to application format
   */
  async function trending(
    params: TMDBTrendingParams = {},
    pages?: number[]
  ): Promise<DiscoverResponse> {
    const { language = 'en-US', time_window = 'week' } = params;
    const client = requireClient();

    const pagesToFetch = pages ?? [1];
    const ranks: Record<MediaType, number> = { movie: 0, tv: 0 };

    const responses = await Promise.all(
      MEDIA_TYPES.flatMap(type =>
        pagesToFetch.map(page => client.trending(type, { language, time_window, page }))
      )
    );

    const results = responses.flatMap(({ results }) =>
      results.map(item => {
        const type = item.type as MediaType;
        const trendingRank = ++ranks[type];

        return transformMedia(item, genreMap, { trendingRank });
      })
    );

    const totalPages = Math.max(...responses.map(r => r.total_pages));

    return { results, page: 1, totalPages };
  }

  /**
   * Get movie or TV show details
   */
  async function details(params: DetailsQuery): Promise<MediaDetails> {
    const { id, type, language = 'en-US' } = params;

    const tmdbMovie = await requireClient().details(type, { id, language });
    return transformDetails(tmdbMovie);
  }

  /**
   * Get all genres.
   * Returns from the in-memory map populated during configure — params are not used.
   */
  async function genres(_params: GenresQuery): Promise<{ genres: Genre[] }> {
    await ensureGenresLoaded();
    const allGenres = [...genreMap.values()];
    return { genres: allGenres };
  }

  /**
   * Find content by external tvdbId
   * Returns TMDB ID for content matching the external ID
   */
  async function findByExternalId(type: MediaType, tvdbId: number): Promise<number | undefined> {
    const result = await requireClient().findByExternalId(tvdbId, 'tvdb_id');
    return type === 'movie' ? result.movie_results?.[0]?.id : result.tv_results?.[0]?.id;
  }

  return {
    getSettings,
    setSettings,
    isConfigured,
    testConnection,
    search,
    discover,
    trending,
    details,
    genres,
    findByExternalId,
  };
}

export type TMDBService = Awaited<ReturnType<typeof createTMDBService>>;
