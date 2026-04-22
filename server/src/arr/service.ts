import type { FastifyInstance } from 'fastify';
import type { DB } from '../db/setup.js';
import { getMediaById } from '../media/repository.js';
import { getArrSettingsFull } from '../settings/repository.js';
import { trimTrailingSlash } from '../utils/links.js';
import { createArrClient, type ArrClient } from './client.js';
import { arrConfig, type ArrServiceConfig } from './config.js';
import { updateMediaIds } from './repository.js';
import type {
  ArrQualityProfile,
  ArrRootFolder,
  ArrQueueResponse,
  ArrLibraryItem,
} from './schemas.js';
import { transformArrMedia } from './transformers.js';

/**
 * Generic Arr service factory - works for both Radarr and Sonarr
 * Eliminates duplication by abstracting service-specific differences
 */
export function createArrService<T extends ArrServiceConfig>(
  db: DB,
  config: T,
  fastify: FastifyInstance
) {
  const { service } = config;

  async function getClient(): Promise<ArrClient<T> | null> {
    const settings = await getArrSettingsFull(db, service);
    if (!settings.url || !settings.apiKey) return null;
    return createArrClient(config, settings.url, settings.apiKey);
  }

  async function getClientAndSettings() {
    const client = await getClient();
    if (!client) return null;

    const { qualityProfileId, rootFolderPath } = await getArrSettingsFull(db, service);
    if (!qualityProfileId || !rootFolderPath) return null;

    return { client, qualityProfileId, rootFolderPath };
  }

  return {
    // Metadata
    config,

    /**
     * Check if service is configured (has URL and API key)
     */
    async isConfigured(): Promise<boolean> {
      const settings = await getArrSettingsFull(db, service);
      return !!(settings.url && settings.apiKey);
    },

    /**
     * Test connection to Radarr/Sonarr
     * Returns false if not configured OR connection fails
     */
    async testConnection(): Promise<boolean> {
      const client = await getClient();
      if (!client) return false;

      return client.testConnection().catch(() => false);
    },

    /**
     * Request media (movie or series)
     * For TV shows, seasons controls which seasons are monitored (null = all seasons)
     * If media already exists in Sonarr/Radarr (arrId provided), updates it instead
     */
    async request(
      mediaId: number,
      id: number | undefined,
      title: string,
      arrId?: number | null,
      seasons?: number[]
    ): Promise<ArrLibraryItem | undefined> {
      const clientSettings = await getClientAndSettings();
      if (!clientSettings) return undefined;

      // For movies: if already in Radarr, no action needed
      if (config.service === 'radarr' && arrId) {
        return undefined; // Already in library, sync will pick it up
      }

      const { client, qualityProfileId, rootFolderPath } = clientSettings;

      const response = await client.requestOrUpdate(
        { id, title, arrId },
        { qualityProfileId, rootFolderPath },
        seasons
      );

      // Transform the response to get ArrLibraryItem with arrUrl
      const libraryItem = transformArrMedia(response);

      await updateMediaIds(db, mediaId, {
        arrId: libraryItem.id,
        tmdbId: libraryItem.tmdbId,
        tvdbId: libraryItem.tvdbId,
        arrUrl: libraryItem.arrUrl,
      });

      fastify.scheduler.start(config.queueFastSyncScheduler);
      return libraryItem;
    },

    /**
     * Get quality profiles
     */
    async getProfiles(): Promise<ArrQualityProfile[]> {
      const client = await getClient();
      if (!client) return [];

      return client.getQualityProfiles();
    },

    /**
     * Get root folders
     */
    async getRootFolders(): Promise<ArrRootFolder[]> {
      const client = await getClient();
      if (!client) return [];

      return client.getRootFolders();
    },

    /**
     * Get library items (movies or series) as unified ArrLibraryItem type
     */
    async getLibrary(): Promise<ArrLibraryItem[]> {
      const client = await getClient();
      if (!client) return [];

      const items = await client.getLibrary();
      return items.map(x => transformArrMedia(x));
    },

    /**
     * Get download queue
     */
    async getQueue(): Promise<ArrQueueResponse> {
      const client = await getClient();
      if (!client) return { records: [] };

      return client.getQueue();
    },

    /**
     * Resolve full ARR URL from internal media ID + current ARR settings.
     * Assumes the media record type matches this service (radarr for movies, sonarr for TV).
     */
    async resolveUrl(mediaId: number): Promise<string | null> {
      const mediaRecord = await getMediaById(db, mediaId);

      if (!mediaRecord?.arrUrl) return null;

      const settings = await getArrSettingsFull(db, service);
      const baseUrl = settings.url;

      if (!baseUrl) return null;

      return `${trimTrailingSlash(baseUrl)}${mediaRecord.arrUrl}`;
    },
  };
}

export type ArrService<T extends ArrServiceConfig = ArrServiceConfig> = ReturnType<
  typeof createArrService<T>
>;

// Union type for utility functions that work with both services
export type AnyArrService =
  | ArrService<typeof arrConfig.radarr>
  | ArrService<typeof arrConfig.sonarr>;
