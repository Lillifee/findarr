import type { DB } from '../db/setup.js';
import { getRadarrSettingsFull, getSonarrSettingsFull } from '../settings/repository.js';
import { createRadarrClient, createSonarrClient } from './client.js';
import type { ArrQualityProfile, ArrRootFolder } from './schemas.js';

export function createArrService(db: DB) {
  async function getRadarrClient() {
    const s = await getRadarrSettingsFull(db);
    if (!s.url || !s.apiKey) return null;
    return createRadarrClient(s.url, s.apiKey);
  }

  async function getSonarrClient() {
    const s = await getSonarrSettingsFull(db);
    if (!s.url || !s.apiKey) return null;
    return createSonarrClient(s.url, s.apiKey);
  }

  async function getRadarrClientAndConfig() {
    const s = await getRadarrSettingsFull(db);
    if (!s.url || !s.apiKey) throw new Error('Radarr is not configured');
    if (!s.qualityProfileId || !s.rootFolderPath)
      throw new Error(
        'Radarr settings not configured. Set quality profile ID and root folder path via admin settings.'
      );
    return {
      client: createRadarrClient(s.url, s.apiKey),
      qualityProfileId: s.qualityProfileId,
      rootFolderPath: s.rootFolderPath,
    };
  }

  async function getSonarrClientAndConfig() {
    const s = await getSonarrSettingsFull(db);
    if (!s.url || !s.apiKey) throw new Error('Sonarr is not configured');
    if (!s.qualityProfileId || !s.rootFolderPath)
      throw new Error(
        'Sonarr settings not configured. Set quality profile ID and root folder path via admin settings.'
      );
    return {
      client: createSonarrClient(s.url, s.apiKey),
      qualityProfileId: s.qualityProfileId,
      rootFolderPath: s.rootFolderPath,
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

    async requestMovie(tmdbId: number, title: string): Promise<void> {
      const { client, qualityProfileId, rootFolderPath } = await getRadarrClientAndConfig();
      await client.addMovie({ tmdbId, title, qualityProfileId, rootFolderPath });
    },

    async requestSeries(tvdbId: number | undefined, title: string): Promise<void> {
      const { client, qualityProfileId, rootFolderPath } = await getSonarrClientAndConfig();
      await client.addSeries({ tvdbId, title, qualityProfileId, rootFolderPath });
    },

    async getRadarrProfiles(): Promise<ArrQualityProfile[]> {
      const client = await getRadarrClient();
      if (!client) return [];
      return client.getQualityProfiles().catch(() => []);
    },

    async getRadarrRootFolders(): Promise<ArrRootFolder[]> {
      const client = await getRadarrClient();
      if (!client) return [];
      return client.getRootFolders().catch(() => []);
    },

    async getSonarrProfiles(): Promise<ArrQualityProfile[]> {
      const client = await getSonarrClient();
      if (!client) return [];
      return client.getQualityProfiles().catch(() => []);
    },

    async getSonarrRootFolders(): Promise<ArrRootFolder[]> {
      const client = await getSonarrClient();
      if (!client) return [];
      return client.getRootFolders().catch(() => []);
    },
  };
}

export type ArrService = ReturnType<typeof createArrService>;
