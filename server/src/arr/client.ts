import { isDefined } from '@findarr/shared';
import axios, { type AxiosInstance } from 'axios';
import { z } from 'zod';
import type { ArrServiceConfig } from './config.js';
import {
  SonarrEpisodeListSchema,
  ArrSystemStatusSchema,
  ArrQualityProfileSchema,
  ArrRootFolderSchema,
  type SonarrEpisode,
  type ArrQualityProfile,
  type ArrRootFolder,
  type ArrQueueResponse,
  type SonarrSeries,
  type RadarrMovie,
  ArrQueueResponseSchema,
} from './schemas.js';

function createHttpClient(baseUrl: string, apiKey: string): AxiosInstance {
  return axios.create({
    baseURL: `${baseUrl}/api/v3`,
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    timeout: 10_000,
  });
}

/**
 * Generic Arr client factory - works for both Radarr and Sonarr
 * Provides unified interface with service-specific implementations
 */
export function createArrClient(config: ArrServiceConfig, baseUrl: string, apiKey: string) {
  const client = createHttpClient(baseUrl, apiKey);
  const isSonarr = config.service === 'sonarr';

  return {
    async testConnection(): Promise<boolean> {
      try {
        const response = await client.get('/system/status', { timeout: 5000 });
        ArrSystemStatusSchema.parse(response.data);
        return true;
      } catch {
        return false;
      }
    },

    async getQualityProfiles(): Promise<ArrQualityProfile[]> {
      const response = await client.get('/qualityprofile');
      return z.array(ArrQualityProfileSchema).parse(response.data);
    },

    async getRootFolders(): Promise<ArrRootFolder[]> {
      const response = await client.get('/rootfolder');
      return z.array(ArrRootFolderSchema).parse(response.data);
    },

    async getQueue(): Promise<ArrQueueResponse> {
      const response = await client.get('/queue');
      return ArrQueueResponseSchema.parse(response.data);
    },

    async requestOrUpdate(
      params: {
        id: number | undefined;
        title: string;
        arrId?: number | undefined | null;
      },
      profileConfig: {
        qualityProfileId: number;
        rootFolderPath: string;
      },
      seasonNumbers?: number[]
    ): Promise<RadarrMovie | SonarrSeries> {
      let media = params.arrId
        ? await this.getLibraryItem(params.arrId)
        : await this.requestMedia({ id: params.id, title: params.title }, profileConfig);

      media = await this.updateLibrarySeasons(media, seasonNumbers);

      return media;
    },

    async requestMedia(
      params: {
        id: number | undefined;
        title: string;
      },
      profileConfig: {
        qualityProfileId: number;
        rootFolderPath: string;
      }
    ): Promise<RadarrMovie | SonarrSeries> {
      const payload = {
        [config.mediaIdField]: params.id,
        title: params.title,
        monitored: true,
        ...profileConfig,
        ...config.extraFields,
      };

      const response = await client.post(config.mediaEndpoint, payload);
      return config.libraryItemSchema.parse(response.data);
    },

    async updateLibrarySeasons(media: RadarrMovie | SonarrSeries, seasons?: number[]) {
      if (!isSonarr || media.type !== 'tv' || !isDefined(seasons)) {
        return media;
      }

      const monitoredSeasons = new Set(seasons);

      const updatedSeasons =
        media.seasons?.map(season => ({
          seasonNumber: season.seasonNumber,
          monitored: monitoredSeasons.has(season.seasonNumber),
        })) ?? [];

      await this.updateSeasonPass(media.id, updatedSeasons);

      const episodes = await this.getEpisodes(media.id);

      const monitoredEpisodeIds = episodes
        .filter(episode => monitoredSeasons.has(episode.seasonNumber))
        .map(episode => episode.id);

      const unmonitoredEpisodeIds = episodes
        .filter(episode => !monitoredSeasons.has(episode.seasonNumber))
        .map(episode => episode.id);

      await Promise.all([
        this.setEpisodeMonitoring(unmonitoredEpisodeIds, false),
        this.setEpisodeMonitoring(monitoredEpisodeIds, true),
      ]);

      if (seasons.length > 0) {
        await this.searchMissingEpisodes(media.id);
      }

      return this.getLibraryItem(media.id);
    },

    async getEpisodes(seriesId: number): Promise<SonarrEpisode[]> {
      const response = await client.get('/episode', { params: { seriesId } });
      return SonarrEpisodeListSchema.parse(response.data);
    },

    async setEpisodeMonitoring(episodeIds: number[], monitored: boolean): Promise<void> {
      if (episodeIds.length === 0) return;
      await client.put('/episode/monitor', { episodeIds, monitored });
    },

    async getLibrary(): Promise<Array<RadarrMovie | SonarrSeries>> {
      const response = await client.get(config.mediaEndpoint);
      return z.array(config.libraryItemSchema).parse(response.data);
    },

    async getLibraryItem(arrId: number): Promise<RadarrMovie | SonarrSeries> {
      const response = await client.get(`${config.mediaEndpoint}/${arrId}`);
      return config.libraryItemSchema.parse(response.data);
    },

    async updateSeasonPass(
      id: number,
      seasons: { seasonNumber: number; monitored: boolean }[]
    ): Promise<void> {
      await client.post('/seasonpass', { series: [{ id, seasons, monitored: true }] });
    },

    async searchMissingEpisodes(seriesId: number): Promise<void> {
      await client.post('/command', { name: 'MissingEpisodeSearch', seriesId });
    },
  };
}

export type ArrClient = ReturnType<typeof createArrClient>;
