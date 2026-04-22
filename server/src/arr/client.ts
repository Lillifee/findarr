import axios, { type AxiosInstance } from 'axios';
import { z } from 'zod';
import { type ArrServiceConfig } from './config.js';
import {
  ArrSystemStatusSchema,
  ArrQualityProfileSchema,
  ArrRootFolderSchema,
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
export function createArrClient<T extends ArrServiceConfig>(
  config: T,
  baseUrl: string,
  apiKey: string
) {
  const http = createHttpClient(baseUrl, apiKey);

  return {
    async testConnection(): Promise<boolean> {
      const response = await http.get('/system/status', { timeout: 5000 });
      ArrSystemStatusSchema.parse(response.data);
      return true;
    },

    async getQualityProfiles(): Promise<ArrQualityProfile[]> {
      const response = await http.get('/qualityprofile');
      return z.array(ArrQualityProfileSchema).parse(response.data);
    },

    async getRootFolders(): Promise<ArrRootFolder[]> {
      const response = await http.get('/rootfolder');
      return z.array(ArrRootFolderSchema).parse(response.data);
    },

    async getQueue(): Promise<ArrQueueResponse> {
      const response = await http.get('/queue');
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
      // Try update if arrId exists
      if (params.arrId) {
        const updated = await this.updateLibrarySeasons(params.arrId, seasonNumbers);
        if (updated) return updated;
      }

      // Create new or fallback from failed update
      return this.requestMedia(
        { id: params.id, title: params.title },
        profileConfig,
        seasonNumbers
      );
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
      seasonNumbers?: number[]
    ): Promise<RadarrMovie | SonarrSeries> {
      const isSonarr = config.service === 'sonarr';

      const payload = {
        [config.mediaIdField]: params.id,
        title: params.title,
        monitored: true,
        ...profileConfig,
        ...config.extraFields,
        ...(isSonarr && seasonNumbers
          ? {
              seasons: seasonNumbers.map(n => ({
                seasonNumber: n,
                monitored: true,
              })),
            }
          : {}),
      };

      const response = await http.post(config.mediaEndpoint, payload);

      return config.libraryItemSchema.parse(response.data);
    },

    async updateLibrarySeasons(
      arrId: number,
      seasons?: number[]
    ): Promise<RadarrMovie | SonarrSeries | undefined> {
      if (config.service !== 'sonarr' || seasons === undefined) {
        return undefined; // Nothing to update
      }

      const { parsed, raw } = await this.getLibraryItem(arrId);
      if (parsed.type !== 'tv') return;

      const series = raw as SonarrSeries;

      await this.updateLibraryItem({
        ...series,
        seasons: series.seasons?.map(season => ({
          ...season,
          monitored: seasons.includes(season.seasonNumber),
        })),
      });

      await http.post('/command', {
        name: 'MissingEpisodeSearch',
        seriesId: arrId,
      });

      return parsed;
    },

    async getLibrary(): Promise<Array<RadarrMovie | SonarrSeries>> {
      const response = await http.get(config.mediaEndpoint);
      return z.array(config.libraryItemSchema).parse(response.data);
    },

    async getLibraryItem(
      arrId: number
    ): Promise<{ parsed: RadarrMovie | SonarrSeries; raw: Record<string, unknown> }> {
      const response = await http.get(`${config.mediaEndpoint}/${arrId}`);
      const parsed = config.libraryItemSchema.parse(response.data);
      return { parsed, raw: response.data };
    },

    async updateLibraryItem(rawData: Record<string, unknown>): Promise<void> {
      await http.put(`${config.mediaEndpoint}/${rawData.id}`, rawData);
    },
  };
}

export type ArrClient<T extends ArrServiceConfig = ArrServiceConfig> = ReturnType<
  typeof createArrClient<T>
>;
