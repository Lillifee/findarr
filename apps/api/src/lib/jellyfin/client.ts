import { isDefined } from '@findarr/shared/utils';
import { create, type AxiosInstance } from 'axios';
import type { FastifyBaseLogger } from 'fastify';

import type { LibClient, LibMedia } from '../types.js';
import { JellyfinItemsResponseSchema } from './schemas.js';
import { jellyfinItemToMedia } from './transformers.js';

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
    headers: { 'X-Emby-Token': apiKey, 'Content-Type': 'application/json' },
    timeout: 30_000,
  });
}

export function createJellyfinLibClient(
  baseUrl: string,
  apiKey: string,
  log: FastifyBaseLogger,
): LibClient {
  const client = createHttpClient(baseUrl, apiKey);

  const getItems = async (params: GetItemsParams) => {
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
  };

  return {
    async testConnection(): Promise<boolean> {
      try {
        const response = await client.get('/System/Info/Public', { timeout: 5000 });
        return response.status === 200;
      } catch (error) {
        log.warn({ name: 'jellyfin', err: error }, 'Connection test failed');
        return false;
      }
    },

    async listLibraryItems(libBaseUrl: string): Promise<LibMedia[]> {
      const allItems: LibMedia[] = [];
      const limit = 100;
      let startIndex = 0;
      let hasMore = true;

      while (hasMore) {
        // Sequential cursor pagination.
        // oxlint-disable-next-line eslint/no-await-in-loop
        const response = await getItems({ itemTypes: ['Movie', 'Series'], startIndex, limit });
        const transformed = response.Items.map((item) =>
          jellyfinItemToMedia(item, libBaseUrl),
        ).filter((item) => isDefined(item));

        allItems.push(...transformed);
        startIndex += response.Items.length;
        hasMore = startIndex < response.TotalRecordCount;
      }

      const tvSeries = allItems.filter((item) => item.type === 'tv');

      await Promise.all(
        tvSeries.map(async (item) => {
          try {
            const seasonsResponse = await getItems({
              itemTypes: ['Season'],
              parentId: item.libId,
            });
            const seasonNumbers = seasonsResponse.Items.filter(
              (season) =>
                season.Type === 'Season' && isDefined(season.IndexNumber) && season.IndexNumber > 0,
            ).map((season) => season.IndexNumber ?? 0);

            if (seasonNumbers.length > 0) {
              item.availableSeasons = seasonNumbers;
            }
          } catch (err) {
            log.debug(
              { name: 'jellyfin', libId: item.libId, err },
              'Season lookup failed, skipping',
            );
          }
        }),
      );

      return allItems;
    },
  };
}
