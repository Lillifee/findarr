import { isDefined } from '@findarr/shared/utils';
import { create, type AxiosInstance } from 'axios';
import type { FastifyBaseLogger } from 'fastify';
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
  type SonarrSeries,
  type RadarrMovie,
  ArrQueueResponseSchema,
  type ArrQueueItem,
} from './schemas.js';

function createHttpClient(baseUrl: string, apiKey: string): AxiosInstance {
  return create({
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
export function createArrClient(
  config: ArrServiceConfig,
  baseUrl: string,
  apiKey: string,
  log: FastifyBaseLogger,
) {
  const client = createHttpClient(baseUrl, apiKey);
  const isSonarr = config.service === 'sonarr';

  return {
    async testConnection(): Promise<boolean> {
      try {
        const response = await client.get('/system/status', { timeout: 5000 });
        ArrSystemStatusSchema.parse(response.data);
        return true;
      } catch (error) {
        log.warn({ name: config.service, err: error }, 'Connection test failed');
        return false;
      }
    },

    async listQualityProfiles(): Promise<ArrQualityProfile[]> {
      const response = await client.get('/qualityprofile');
      return z.array(ArrQualityProfileSchema).parse(response.data);
    },

    async listRootFolders(): Promise<ArrRootFolder[]> {
      const response = await client.get('/rootfolder');
      return z.array(ArrRootFolderSchema).parse(response.data);
    },

    async getQueue(pageSize: number): Promise<ArrQueueItem[]> {
      const response = await client.get('/queue', { params: { page: 1, pageSize } });
      return ArrQueueResponseSchema.parse(response.data).records;
    },

    async requestOrUpdateMedia(
      params: {
        id: number | undefined;
        title: string;
        arrId?: number | undefined | null;
      },
      profileConfig: {
        qualityProfileId: number;
        rootFolderPath: string;
      },
      seasonNumbers?: number[],
    ): Promise<RadarrMovie | SonarrSeries> {
      const media =
        (await this.tryGetLibraryItemById(params.arrId)) ??
        (await this.requestMedia(params, profileConfig));

      return this.updateLibrarySeasons(media, seasonNumbers);
    },

    async requestMedia(
      params: {
        id: number | undefined;
        title: string;
      },
      profileConfig: {
        qualityProfileId: number;
        rootFolderPath: string;
      },
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
        media.seasons?.map((season) => ({
          seasonNumber: season.seasonNumber,
          monitored: monitoredSeasons.has(season.seasonNumber),
        })) ?? [];

      await this.updateSeasonPass(media.id, updatedSeasons);

      const episodes = await this.getEpisodes(media.id);

      const monitoredEpisodeIds = episodes
        .filter((episode) => monitoredSeasons.has(episode.seasonNumber))
        .map((episode) => episode.id);

      const unmonitoredEpisodeIds = episodes
        .filter((episode) => !monitoredSeasons.has(episode.seasonNumber))
        .map((episode) => episode.id);

      await Promise.all([
        this.updateEpisodeMonitoring(unmonitoredEpisodeIds, false),
        this.updateEpisodeMonitoring(monitoredEpisodeIds, true),
      ]);

      if (seasons.length > 0) {
        await this.searchMissingEpisodes(media.id);
      }

      return this.getLibraryItemById(media.id);
    },

    async getEpisodes(seriesId: number): Promise<SonarrEpisode[]> {
      const response = await client.get('/episode', { params: { seriesId } });
      return SonarrEpisodeListSchema.parse(response.data);
    },

    async updateEpisodeMonitoring(episodeIds: number[], monitored: boolean): Promise<void> {
      if (episodeIds.length === 0) {
        return;
      }
      await client.put('/episode/monitor', { episodeIds, monitored });
    },

    async listLibraryItems(): Promise<(RadarrMovie | SonarrSeries)[]> {
      const response = await client.get(config.mediaEndpoint);
      return z.array(config.libraryItemSchema).parse(response.data);
    },

    async getLibraryItemById(arrId: number): Promise<RadarrMovie | SonarrSeries> {
      const response = await client.get(`${config.mediaEndpoint}/${arrId}`);
      return config.libraryItemSchema.parse(response.data);
    },

    async tryGetLibraryItemById(arrId?: number | null): Promise<RadarrMovie | SonarrSeries | null> {
      if (!isDefined(arrId)) {
        return null;
      }

      // In case the item was deleted from the library we want to handle that gracefully.
      const media = await this.getLibraryItemById(arrId).catch(() => null);
      return media;
    },

    async updateSeasonPass(
      id: number,
      seasons: { seasonNumber: number; monitored: boolean }[],
    ): Promise<void> {
      await client.post('/seasonpass', { series: [{ id, seasons, monitored: true }] });
    },

    async searchMissingEpisodes(seriesId: number): Promise<void> {
      await client.post('/command', { name: 'MissingEpisodeSearch', seriesId });
    },
  };
}

export type ArrClient = ReturnType<typeof createArrClient>;
