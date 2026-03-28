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
  type ArrAddMediaResponse,
  type SonarrSeries,
  type RadarrMovie,
  ArrAddMediaResponseSchema,
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

    async requestMedia(
      params: {
        id: number | undefined;
        title: string;
      },
      profileConfig: {
        qualityProfileId: number;
        rootFolderPath: string;
      }
    ): Promise<ArrAddMediaResponse> {
      const response = await http.post(config.mediaEndpoint, {
        [config.mediaIdField]: params.id,
        title: params.title,
        monitored: true,
        ...profileConfig,
        ...config.extraFields,
      });

      return ArrAddMediaResponseSchema.parse(response.data);
    },

    async getLibrary(): Promise<Array<RadarrMovie | SonarrSeries>> {
      const response = await http.get(config.mediaEndpoint);
      return z.array(config.libraryItemSchema).parse(response.data);
    },
  };
}

export type ArrClient<T extends ArrServiceConfig = ArrServiceConfig> = ReturnType<
  typeof createArrClient<T>
>;
