import type { DB } from '../db/setup.js';
import { getJellyfinSettingsFull } from '../settings/repository.js';
import { createJellyfinClient } from './client.js';
import type { JellyfinMedia } from './transformers.js';
import { jellyfinItemToMedia } from './transformers.js';

export function createJellyfinService(db: DB) {
  async function getClient() {
    const s = await getJellyfinSettingsFull(db);
    if (!s.url || !s.apiKey) return null;
    return createJellyfinClient(s.url, s.apiKey);
  }

  async function fetchMedia(itemTypes: ('Movie' | 'Series')[]): Promise<JellyfinMedia[]> {
    const client = await getClient();
    if (!client) return [];

    const allItems: JellyfinMedia[] = [];
    const limit = 100;
    let startIndex = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await client.getItems({
        itemTypes,
        startIndex,
        limit,
        recursive: true,
      });

      const transformed = response.Items.map(item => jellyfinItemToMedia(item)).filter(
        (item): item is JellyfinMedia => item !== undefined
      );

      allItems.push(...transformed);
      startIndex += response.Items.length;
      hasMore = startIndex < response.TotalRecordCount;
    }

    return allItems;
  }

  return {
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
      if (!s.url || !s.apiKey) return { url: s.url, connected: false, apiKeySet: s.apiKeySet };
      const connected = await createJellyfinClient(s.url, s.apiKey)
        .testConnection()
        .catch(() => false);
      return { url: s.url, connected, apiKeySet: s.apiKeySet };
    },

    async getAllMedia(): Promise<JellyfinMedia[]> {
      return fetchMedia(['Movie', 'Series']);
    },
  };
}

export type JellyfinService = ReturnType<typeof createJellyfinService>;
