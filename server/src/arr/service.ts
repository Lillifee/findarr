import type { DB } from '../db/setup.js';
import { getRadarrSettingsFull, getSonarrSettingsFull } from '../settings/repository.js';
import { createRadarrClient, createSonarrClient } from './client.js';
import type { ArrQualityProfile, ArrRootFolder } from './schemas.js';

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
    if (!s.radarrUrl || !s.radarrApiKey) throw new Error('Radarr is not configured');
    if (!s.radarrQualityProfileId || !s.radarrRootFolderPath)
      throw new Error(
        'Radarr settings not configured. Set quality profile ID and root folder path via admin settings.'
      );
    return {
      client: createRadarrClient(s.radarrUrl, s.radarrApiKey),
      qualityProfileId: s.radarrQualityProfileId,
      rootFolderPath: s.radarrRootFolderPath,
    };
  }

  async function getSonarrClientAndConfig() {
    const s = await getSonarrSettingsFull(db);
    if (!s.sonarrUrl || !s.sonarrApiKey) throw new Error('Sonarr is not configured');
    if (!s.sonarrQualityProfileId || !s.sonarrRootFolderPath)
      throw new Error(
        'Sonarr settings not configured. Set quality profile ID and root folder path via admin settings.'
      );
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
  };
}

export type ArrService = ReturnType<typeof createArrService>;
