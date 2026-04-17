import { isDefined } from '@findarr/shared';
import type { DB } from '../db/setup.js';
import { getMediaById } from '../media/repository.js';
import { getJellyfinSettingsFull } from '../settings/repository.js';
import { trimTrailingSlash } from '../utils/links.js';
import { createJellyfinClient } from './client.js';
import type { JellyfinMedia } from './transformers.js';
import { jellyfinItemToMedia } from './transformers.js';

export function createJellyfinService(db: DB) {
  async function getClient() {
    const s = await getJellyfinSettingsFull(db);
    if (!s.jellyfinUrl || !s.jellyfinApiKey) return null;
    return createJellyfinClient(s.jellyfinUrl, s.jellyfinApiKey);
  }

  return {
    async isConfigured(): Promise<boolean> {
      const s = await getJellyfinSettingsFull(db);
      return !!(s.jellyfinUrl && s.jellyfinApiKey);
    },

    async testConnection(): Promise<boolean> {
      const client = await getClient();
      if (!client) return false;
      return client.testConnection().catch(() => false);
    },

    async getConnectionInfo(): Promise<{
      url: string | null;
      connected: boolean;
      apiKeySet: boolean;
    }> {
      const s = await getJellyfinSettingsFull(db);
      if (!s.jellyfinUrl || !s.jellyfinApiKey)
        return { url: s.jellyfinUrl, connected: false, apiKeySet: s.jellyfinApiKeySet };
      const connected = await createJellyfinClient(s.jellyfinUrl, s.jellyfinApiKey)
        .testConnection()
        .catch(() => false);
      return { url: s.jellyfinUrl, connected, apiKeySet: s.jellyfinApiKeySet };
    },

    /**
     * Get all media with season availability embedded for TV shows
     */
    async getAllMedia(): Promise<JellyfinMedia[]> {
      const client = await getClient();
      if (!client) return [];

      const allItems: JellyfinMedia[] = [];
      const limit = 100;
      let startIndex = 0;
      let hasMore = true;

      while (hasMore) {
        const response = await client.getItems({
          itemTypes: ['Movie', 'Series'],
          startIndex,
          limit,
        });

        const transformed = response.Items.map(item => jellyfinItemToMedia(item)).filter(item =>
          isDefined(item)
        );

        allItems.push(...transformed);
        startIndex += response.Items.length;
        hasMore = startIndex < response.TotalRecordCount;
      }

      // For TV series, fetch and embed available seasons
      const tvSeries = allItems.filter(item => item.type === 'tv');

      await Promise.all(
        tvSeries.map(async item => {
          try {
            const seasonsResponse = await client.getItems({
              itemTypes: ['Season'],
              parentId: item.jellyfinId,
            });

            const seasonNumbers = seasonsResponse.Items.filter(
              season =>
                season.Type === 'Season' && isDefined(season.IndexNumber) && season.IndexNumber > 0
            ).map(season => season.IndexNumber as number);

            if (seasonNumbers.length > 0) {
              item.availableSeasons = seasonNumbers;
            }
          } catch {
            // Don't fail entire sync if one series fails
            // TODO: Add logging here to track failures?
          }
        })
      );

      return allItems;
    },

    /**
     * Resolve full Jellyfin URL from internal media ID + current Jellyfin settings.
     * Fetches media record to get jellyfinId, then constructs URL with base URL.
     */
    async resolveUrl(mediaId: number): Promise<string | null> {
      // Fetch media record by internal ID
      const mediaRecord = await getMediaById(db, mediaId);
      if (!mediaRecord?.jellyfinId) return null;

      const settings = await getJellyfinSettingsFull(db);
      const baseUrl = settings.jellyfinUrl;

      if (!baseUrl || !settings.jellyfinApiKey) return null;

      return `${trimTrailingSlash(baseUrl)}/web/index.html?#/details?id=${mediaRecord.jellyfinId}`;
    },
  };
}

export type JellyfinService = ReturnType<typeof createJellyfinService>;
