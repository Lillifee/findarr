import type { JellyfinClient } from './client.js';
import type { JellyfinMedia } from './transformers.js';
import { jellyfinItemToMedia } from './transformers.js';

export function createJellyfinService(client: JellyfinClient) {
  /**
   * Fetch all items of specific types with pagination
   */
  async function fetchMedia(itemTypes: ('Movie' | 'Series')[]): Promise<JellyfinMedia[]> {
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

      // Transform and filter items (only keep those with TMDB IDs)
      const transformed = response.Items.map(item => jellyfinItemToMedia(item)).filter(
        (item): item is JellyfinMedia => item !== undefined
      );

      allItems.push(...transformed);

      // Check if there are more items
      startIndex += response.Items.length;
      hasMore = startIndex < response.TotalRecordCount;
    }

    return allItems;
  }

  return {
    async testConnection(): Promise<boolean> {
      return await client.testConnection();
    },

    async getAllMedia(): Promise<JellyfinMedia[]> {
      return await fetchMedia(['Movie', 'Series']);
    },
  };
}

export type JellyfinService = ReturnType<typeof createJellyfinService>;
