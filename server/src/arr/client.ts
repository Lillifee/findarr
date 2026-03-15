import axios, { type AxiosInstance } from 'axios';
import { z } from 'zod';
import {
  ArrSystemStatusSchema,
  ArrQualityProfileSchema,
  ArrRootFolderSchema,
  RadarrAddMovieResponseSchema,
  SonarrAddSeriesResponseSchema,
  type ArrQualityProfile,
  type ArrRootFolder,
  type RadarrAddMovieResponse,
  type SonarrAddSeriesResponse,
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

// Shared endpoints — identical on Radarr and Sonarr v3
function createSharedMethods(http: AxiosInstance) {
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
  };
}

export interface AddMovieParams {
  tmdbId: number;
  title: string;
  qualityProfileId: number;
  rootFolderPath: string;
}

export interface AddSeriesParams {
  tvdbId: number | undefined;
  title: string;
  qualityProfileId: number;
  rootFolderPath: string;
}

export function createRadarrClient(baseUrl: string, apiKey: string) {
  const http = createHttpClient(baseUrl, apiKey);

  return {
    ...createSharedMethods(http),

    async addMovie(params: AddMovieParams): Promise<RadarrAddMovieResponse> {
      const response = await http.post('/movie', {
        tmdbId: params.tmdbId,
        title: params.title,
        qualityProfileId: params.qualityProfileId,
        rootFolderPath: params.rootFolderPath,
        monitored: true,
        addOptions: { searchForMovie: true },
      });
      return RadarrAddMovieResponseSchema.parse(response.data);
    },
  };
}

export function createSonarrClient(baseUrl: string, apiKey: string) {
  const http = createHttpClient(baseUrl, apiKey);

  return {
    ...createSharedMethods(http),

    async addSeries(params: AddSeriesParams): Promise<SonarrAddSeriesResponse> {
      const response = await http.post('/series', {
        tvdbId: params.tvdbId,
        title: params.title,
        qualityProfileId: params.qualityProfileId,
        rootFolderPath: params.rootFolderPath,
        monitored: true,
        seasons: [],
        addOptions: { searchForMissingEpisodes: true },
      });
      return SonarrAddSeriesResponseSchema.parse(response.data);
    },
  };
}

export type RadarrClient = ReturnType<typeof createRadarrClient>;
export type SonarrClient = ReturnType<typeof createSonarrClient>;
