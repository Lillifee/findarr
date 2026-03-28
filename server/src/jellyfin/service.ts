import { isDefined } from '@findarr/shared';
import type { DB } from '../db/setup.js';
import { getJellyfinSettingsFull } from '../settings/repository.js';
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

      return allItems;
    },
  };
}

export type JellyfinService = ReturnType<typeof createJellyfinService>;
