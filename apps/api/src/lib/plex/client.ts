import { isDefined } from '@findarr/shared/utils';
import { create, type AxiosInstance } from 'axios';

import type { AppLogger } from '../../utils/logger.js';
import type { LibClient, LibMedia } from '../types.js';
import {
  PlexIdentitySchema,
  PlexMediaContainerSchema,
  PlexSectionsResponseSchema,
  type PlexMetadataItem,
} from './schemas.js';
import { plexItemToMedia } from './transformers.js';

function createHttpClient(baseUrl: string, token: string): AxiosInstance {
  return create({
    baseURL: baseUrl,
    headers: { 'X-Plex-Token': token, Accept: 'application/json' },
    timeout: 30_000,
  });
}

export function createPlexLibClient(baseUrl: string, token: string, appLog: AppLogger): LibClient {
  const client = createHttpClient(baseUrl, token);
  const log = appLog.scope('plex');

  const getMachineIdentifier = async (): Promise<string> => {
    const response = await client.get('/identity', { timeout: 5000 });
    return PlexIdentitySchema.parse(response.data).MediaContainer.machineIdentifier;
  };

  const getSections = async () => {
    const response = await client.get('/library/sections');
    return PlexSectionsResponseSchema.parse(response.data).MediaContainer.Directory ?? [];
  };

  const getSectionItems = async (
    sectionKey: string,
    start: number,
    pageSize: number,
  ): Promise<{ items: PlexMetadataItem[]; total: number }> => {
    const response = await client.get(`/library/sections/${sectionKey}/all`, {
      params: {
        'X-Plex-Container-Start': start,
        'X-Plex-Container-Size': pageSize,
        includeGuids: 1,
      },
    });
    const parsed = PlexMediaContainerSchema.parse(response.data);
    const items = parsed.MediaContainer.Metadata ?? [];
    const total = parsed.MediaContainer.totalSize ?? items.length;

    return { items, total };
  };

  const getChildSeasons = async (ratingKey: string): Promise<PlexMetadataItem[]> => {
    const response = await client.get(`/library/metadata/${ratingKey}/children`);
    const parsed = PlexMediaContainerSchema.parse(response.data);
    return (parsed.MediaContainer.Metadata ?? []).filter((item) => item.type === 'season');
  };

  return {
    async testConnection(): Promise<boolean> {
      try {
        const response = await client.get('/identity', { timeout: 5000 });
        return response.status === 200;
      } catch (error) {
        log.warn({ err: error }, 'Connection test failed');
        return false;
      }
    },

    async listLibraryItems(libBaseUrl: string): Promise<LibMedia[]> {
      const machineIdentifier = await getMachineIdentifier();
      const sections = await getSections();
      const allItems: LibMedia[] = [];

      await Promise.all(
        sections.map(async (section) => {
          try {
            const pageSize = 100;
            let start = 0;
            let total = Infinity;

            while (start < total) {
              // Sequential cursor pagination per section.
              // oxlint-disable-next-line eslint/no-await-in-loop
              const { items, total: fetchedTotal } = await getSectionItems(
                section.key,
                start,
                pageSize,
              );
              total = fetchedTotal;

              const transformed = items
                .map((item) => plexItemToMedia(item, libBaseUrl, machineIdentifier))
                .filter((item) => isDefined(item));
              allItems.push(...transformed);
              start += items.length;
              if (items.length === 0) {
                break;
              }
            }
          } catch (err) {
            log.warn(
              { sectionKey: section.key, sectionTitle: section.title, err },
              'Failed to fetch section items, skipping',
            );
          }
        }),
      );

      const tvSeries = allItems.filter((item) => item.type === 'tv');

      await Promise.all(
        tvSeries.map(async (item) => {
          try {
            const seasons = await getChildSeasons(item.libId);
            const seasonNumbers = seasons
              .filter((s) => isDefined(s.index) && s.index > 0)
              .map((s) => s.index ?? 0);
            if (seasonNumbers.length > 0) {
              item.availableSeasons = seasonNumbers;
            }
          } catch (err) {
            log.debug({ libId: item.libId, err }, 'Season lookup failed, skipping');
          }
        }),
      );

      return allItems;
    },
  };
}
