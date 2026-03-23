import type { DB } from '../db/setup.js';
import { getRadarrSettingsFull, getSonarrSettingsFull } from '../settings/repository.js';
import { createRadarrClient, createSonarrClient } from './client.js';
import type {
  ArrQualityProfile,
  ArrRootFolder,
  RadarrMovie,
  SonarrSeries,
  ArrQueueResponse,
  RadarrAddMovieResponse,
  SonarrAddSeriesResponse,
} from './schemas.js';

export function createArrService(db: DB) {
  async function getRadarrClient() {
    const s = await getRadarrSettingsFull(db);
    if (!s.radarrUrl || !s.radarrApiKey) return null;
    return createRadarrClient(s.radarrUrl, s.radarrApiKey);
  }

  async function getSonarrClient() {
    const s = await getSonarrSettingsFull(db);
    if (!s.sonarrUrl || !s.sonarrApiKey) return null;
    return createSonarrClient(s.sonarrUrl, s.sonarrApiKey);
  }

  async function getRadarrClientAndConfig() {
    const s = await getRadarrSettingsFull(db);
    if (!s.radarrUrl || !s.radarrApiKey) return null;
    if (!s.radarrQualityProfileId || !s.radarrRootFolderPath) return null;
    return {
      client: createRadarrClient(s.radarrUrl, s.radarrApiKey),
      qualityProfileId: s.radarrQualityProfileId,
      rootFolderPath: s.radarrRootFolderPath,
    };
  }

  async function getSonarrClientAndConfig() {
    const s = await getSonarrSettingsFull(db);
    if (!s.sonarrUrl || !s.sonarrApiKey) return null;
    if (!s.sonarrQualityProfileId || !s.sonarrRootFolderPath) return null;
    return {
      client: createSonarrClient(s.sonarrUrl, s.sonarrApiKey),
      qualityProfileId: s.sonarrQualityProfileId,
      rootFolderPath: s.sonarrRootFolderPath,
    };
  }

  return {
    async testRadarrConnection(): Promise<boolean> {
      const client = await getRadarrClient();
      if (!client) return false;
      return client.testConnection().catch(() => false);
    },

    async testSonarrConnection(): Promise<boolean> {
      const client = await getSonarrClient();
      if (!client) return false;
      return client.testConnection().catch(() => false);
    },

    async requestMovie(
      tmdbId: number,
      title: string
    ): Promise<RadarrAddMovieResponse | Record<string, never>> {
      const config = await getRadarrClientAndConfig();
      if (!config) return {};
      const { client, qualityProfileId, rootFolderPath } = config;
      return await client.addMovie({ tmdbId, title, qualityProfileId, rootFolderPath });
    },

    async requestSeries(
      tvdbId: number | undefined,
      title: string
    ): Promise<SonarrAddSeriesResponse | Record<string, never>> {
      const config = await getSonarrClientAndConfig();
      if (!config) return {};
      const { client, qualityProfileId, rootFolderPath } = config;
      return await client.addSeries({ tvdbId, title, qualityProfileId, rootFolderPath });
    },

    async getRadarrProfiles(): Promise<ArrQualityProfile[]> {
      const client = await getRadarrClient();
      if (!client) return [];
      return client.getQualityProfiles();
    },

    async getRadarrRootFolders(): Promise<ArrRootFolder[]> {
      const client = await getRadarrClient();
      if (!client) return [];
      return client.getRootFolders();
    },

    async getSonarrProfiles(): Promise<ArrQualityProfile[]> {
      const client = await getSonarrClient();
      if (!client) return [];
      return client.getQualityProfiles();
    },

    async getSonarrRootFolders(): Promise<ArrRootFolder[]> {
      const client = await getSonarrClient();
      if (!client) return [];
      return client.getRootFolders();
    },

    async getRadarrMovies(): Promise<RadarrMovie[]> {
      const config = await getRadarrClientAndConfig();
      if (!config) return [];
      return config.client.getMovies();
    },

    async getSonarrSeries(): Promise<SonarrSeries[]> {
      const config = await getSonarrClientAndConfig();
      if (!config) return [];
      return config.client.getSeries();
    },

    async getRadarrQueue(): Promise<ArrQueueResponse> {
      const client = await getRadarrClient();
      if (!client) return { records: [] };
      return client.getQueue();
    },

    async getSonarrQueue(): Promise<ArrQueueResponse> {
      const client = await getSonarrClient();
      if (!client) return { records: [] };
      return client.getQueue();
    },
  };
}

export type ArrService = ReturnType<typeof createArrService>;
