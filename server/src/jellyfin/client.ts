import axios, { type AxiosInstance } from 'axios';
import { JellyfinItemsResponseSchema, type JellyfinItemsResponse } from './schemas.js';

export interface JellyfinClient {
  testConnection: () => Promise<boolean>;
  getItems: (params: GetItemsParams) => Promise<JellyfinItemsResponse>;
}

export interface GetItemsParams {
  itemTypes: ('Movie' | 'Series' | 'Season')[];
  parentId?: string;
  startIndex?: number;
  limit?: number;
  recursive?: boolean;
}

export function createJellyfinClient(baseUrl: string, apiKey: string): JellyfinClient {
  // Create axios instance with base config
  const client: AxiosInstance = axios.create({
    baseURL: baseUrl,
    headers: {
      'X-Emby-Token': apiKey, // Jellyfin uses Emby's auth header
      'Content-Type': 'application/json',
    },
    timeout: 30_000, // 30 second timeout
  });

  return {
    async testConnection(): Promise<boolean> {
      const response = await client.get('/System/Info/Public', { timeout: 5000 });
      return response.status === 200;
    },

    async getItems(params: GetItemsParams): Promise<JellyfinItemsResponse> {
      const { itemTypes, parentId, startIndex = 0, limit = 100, recursive = true } = params;

      const response = await client.get('/Items', {
        params: {
          IncludeItemTypes: itemTypes.join(','),
          ...(parentId && { ParentId: parentId }),
          StartIndex: startIndex,
          Limit: limit,
          Recursive: recursive,
          Fields: 'ProviderIds,Overview,ProductionYear,DateCreated',
          SortBy: 'DateCreated',
          SortOrder: 'Descending',
        },
      });

      // Validate response with Zod
      return JellyfinItemsResponseSchema.parse(response.data);
    },
  };
}
