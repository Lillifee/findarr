import { create, type AxiosInstance } from 'axios';
import type { FastifyBaseLogger } from 'fastify';

import {
  PlexIdentitySchema,
  PlexMediaContainerSchema,
  PlexSectionsResponseSchema,
  type PlexMetadataItem,
  type PlexSection,
} from './schemas.js';

function createHttpClient(baseUrl: string, token: string): AxiosInstance {
  return create({
    baseURL: baseUrl,
    headers: {
      'X-Plex-Token': token,
      Accept: 'application/json',
    },
    timeout: 30_000,
  });
}

export function createPlexClient(baseUrl: string, token: string, log: FastifyBaseLogger) {
  const client = createHttpClient(baseUrl, token);

  return {
    async testConnection(): Promise<boolean> {
      try {
        const response = await client.get('/identity', { timeout: 5000 });
        return response.status === 200;
      } catch (error) {
        log.warn({ name: 'plex', err: error }, 'Connection test failed');
        return false;
      }
    },

    async getMachineIdentifier(): Promise<string> {
      const response = await client.get('/identity', { timeout: 5000 });
      const parsed = PlexIdentitySchema.parse(response.data);
      return parsed.MediaContainer.machineIdentifier;
    },

    async getSections(): Promise<PlexSection[]> {
      const response = await client.get('/library/sections');
      const parsed = PlexSectionsResponseSchema.parse(response.data);
      return parsed.MediaContainer.Directory ?? [];
    },

    async getSectionItems(
      sectionKey: string,
      start: number,
      pageSize: number,
    ): Promise<{ items: PlexMetadataItem[]; total: number }> {
      const response = await client.get(`/library/sections/${sectionKey}/all`, {
        params: {
          'X-Plex-Container-Start': start,
          'X-Plex-Container-Size': pageSize,
          includeGuids: 1,
        },
      });
      const parsed = PlexMediaContainerSchema.parse(response.data);
      const items = parsed.MediaContainer.Metadata ?? [];
      const total = parsed.MediaContainer.TotalSize ?? items.length;
      return { items, total };
    },

    async getChildSeasons(ratingKey: string): Promise<PlexMetadataItem[]> {
      const response = await client.get(`/library/metadata/${ratingKey}/children`);
      const parsed = PlexMediaContainerSchema.parse(response.data);
      return (parsed.MediaContainer.Metadata ?? []).filter((item) => item.type === 'season');
    },
  };
}

export type PlexClient = ReturnType<typeof createPlexClient>;
