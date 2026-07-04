import { isDefined } from '@findarr/shared/utils';
import { create, type AxiosInstance } from 'axios';
import { z } from 'zod';

import type { AppLogger } from '../utils/logger.js';
import type { ArrServiceConfig } from './config.js';
import {
  ArrSystemStatusSchema,
  ArrQualityProfileSchema,
  ArrRootFolderSchema,
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
  appLog: AppLogger,
) {
  const client = createHttpClient(baseUrl, apiKey);
  const isSonarr = config.service === 'sonarr';
  const log = appLog.scope(config.service);

  return {
    async testConnection(): Promise<boolean> {
      try {
        const timer = log.timer('testConnection');

        const response = await client.get('/system/status', { timeout: 5000 });
        ArrSystemStatusSchema.parse(response.data);

        timer.end();
        return true;
      } catch (error) {
        log.warn({ err: error }, 'Connection test failed');
        return false;
      }
    },

    async listQualityProfiles(): Promise<ArrQualityProfile[]> {
      const timer = log.timer('listQualityProfiles');

      const response = await client.get('/qualityprofile');
      const result = z.array(ArrQualityProfileSchema).parse(response.data);

      timer.end();
      return result;
    },

    async listRootFolders(): Promise<ArrRootFolder[]> {
      const timer = log.timer('listRootFolders');

      const response = await client.get('/rootfolder');
      const result = z.array(ArrRootFolderSchema).parse(response.data);

      timer.end();
      return result;
    },

    async getQueue(pageSize: number): Promise<ArrQueueItem[]> {
      const timer = log.timer('getQueue', { pageSize });

      const response = await client.get('/queue', { params: { page: 1, pageSize } });
      const result = ArrQueueResponseSchema.parse(response.data).records;

      timer.end();
      return result;
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
      const existing = await this.tryGetLibraryItemById(params.arrId);

      // TV show: if already in Sonarr, update else request
      if (isSonarr) {
        return existing
          ? this.updateLibrarySeasons(existing.id, seasonNumbers)
          : this.requestMedia(params, profileConfig, seasonNumbers);
      }

      // Movie: if already in Radarr, nothing to update
      return existing ?? this.requestMedia(params, profileConfig);
    },

    async buildSeasonList(
      tvdbId: number,
      monitoredSeasonNumbers: number[],
    ): Promise<{ seasonNumber: number; monitored: boolean }[] | undefined> {
      const response = await client.get<unknown[]>('/series/lookup', {
        params: { term: `tvdb:${tvdbId}` },
      });
      const LookupSchema = z.array(
        z.object({
          seasons: z
            .array(z.object({ seasonNumber: z.number(), monitored: z.boolean() }))
            .optional(),
        }),
      );
      const [first] = LookupSchema.parse(response.data);
      return first?.seasons?.map((season) => ({
        seasonNumber: season.seasonNumber,
        monitored: monitoredSeasonNumbers.includes(season.seasonNumber),
      }));
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
      seasonNumbers?: number[],
    ): Promise<RadarrMovie | SonarrSeries> {
      const timer = log.timer('requestMedia', { title: params.title });

      const seasons =
        isSonarr && isDefined(params.id) && isDefined(seasonNumbers)
          ? await this.buildSeasonList(params.id, seasonNumbers)
          : undefined;

      const payload = {
        [config.mediaIdField]: params.id,
        title: params.title,
        monitored: true,
        ...(seasons ? { seasons } : {}),
        ...profileConfig,
        ...config.extraFields,
      };

      const response = await client.post(config.mediaEndpoint, payload);
      const result = config.libraryItemSchema.parse(response.data);

      timer.end();
      return result;
    },

    async updateLibrarySeasons(seriesId: number, seasons?: number[]) {
      const timer = log.timer('updateLibrarySeasons', { seriesId, seasons });

      const monitoredSeasons = new Set(seasons);

      // Fetch the full series object from Sonarr — our parsed schema strips many fields
      // that Sonarr requires on PUT (path, seriesType, etc.). We update only seasons.
      const fullResponse = await client.get<Record<string, unknown>>(
        `${config.mediaEndpoint}/${seriesId}`,
      );
      const fullSeries = fullResponse.data;

      const existingSeasons = z
        .array(z.looseObject({ seasonNumber: z.number(), monitored: z.boolean() }))
        .optional()
        .parse(fullSeries['seasons']);

      const updatedSeries = {
        ...fullSeries,
        seasons: existingSeasons?.map((season) => ({
          ...season,
          monitored: monitoredSeasons.has(season.seasonNumber),
        })),
      };

      // PUT /series with updated seasons — Sonarr calls SetEpisodeMonitoredBySeason
      // internally for each changed season, so no separate episode monitoring calls needed.
      const response = await client.put(config.mediaEndpoint, updatedSeries);
      const result = config.libraryItemSchema.parse(response.data);

      if (isDefined(seasons) && seasons.length > 0) {
        await this.searchMissingEpisodes(seriesId);
      }

      timer.end();
      return result;
    },

    async listLibraryItems(): Promise<(RadarrMovie | SonarrSeries)[]> {
      const timer = log.timer('listLibraryItems');

      const response = await client.get(config.mediaEndpoint);
      const result = z.array(config.libraryItemSchema).parse(response.data);

      timer.end();
      return result;
    },

    async getLibraryItemById(arrId: number): Promise<RadarrMovie | SonarrSeries> {
      const timer = log.timer('getLibraryItemById', { arrId });

      const response = await client.get(`${config.mediaEndpoint}/${arrId}`);
      const result = config.libraryItemSchema.parse(response.data);

      timer.end();
      return result;
    },

    async tryGetLibraryItemById(arrId?: number | null): Promise<RadarrMovie | SonarrSeries | null> {
      if (!isDefined(arrId)) {
        return null;
      }

      // In case the item was deleted from the library we want to handle that gracefully.
      const media = await this.getLibraryItemById(arrId).catch(() => null);
      return media;
    },

    async searchMissingEpisodes(seriesId: number): Promise<void> {
      await client.post('/command', { name: 'MissingEpisodeSearch', seriesId });
    },
  };
}

export type ArrClient = ReturnType<typeof createArrClient>;
