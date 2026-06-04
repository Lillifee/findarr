import { isDefined } from '@findarr/shared/utils';
import { create, type AxiosInstance } from 'axios';

import { JellyfinItemsResponseSchema, type JellyfinItemsResponse } from './schemas.js';

export interface GetItemsParams {
  itemTypes: ('Movie' | 'Series' | 'Season')[];
  parentId?: string;
  startIndex?: number;
  limit?: number;
  recursive?: boolean;
}

function createHttpClient(baseUrl: string, apiKey: string): AxiosInstance {
  return create({
    baseURL: baseUrl,
    headers: {
      'X-Emby-Token': apiKey,
      'Content-Type': 'application/json',
    },
    timeout: 30_000,
  });
}

export function createJellyfinClient(baseUrl: string, apiKey: string) {
  const client = createHttpClient(baseUrl, apiKey);

  return {
    async testConnection(): Promise<boolean> {
      try {
        const response = await client.get('/System/Info/Public', { timeout: 5000 });
        return response.status === 200;
      } catch {
        return false;
      }
    },

    async getItems(params: GetItemsParams): Promise<JellyfinItemsResponse> {
      const { itemTypes, parentId, startIndex = 0, limit = 100, recursive = true } = params;

      const response = await client.get('/Items', {
        params: {
          IncludeItemTypes: itemTypes.join(','),
          ...(isDefined(parentId) && { ParentId: parentId }),
          StartIndex: startIndex,
          Limit: limit,
          Recursive: recursive,
          Fields: 'ProviderIds,Overview,ProductionYear,DateCreated',
          SortBy: 'DateCreated',
          SortOrder: 'Descending',
        },
      });

      return JellyfinItemsResponseSchema.parse(response.data);
    },
  };
}

export type JellyfinClient = ReturnType<typeof createJellyfinClient>;
