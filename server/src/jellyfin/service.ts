import { isDefined, type JellyfinSettingsQuery } from '@findarr/shared';
import type { FastifyBaseLogger } from 'fastify';
import type { Database } from '../db/service.js';
import { getMediaById } from '../media/repository.js';
import { createClientLifecycle } from '../utils/clientLifecycleHepler.js';
import { trimTrailingSlash } from '../utils/links.js';
import { createJellyfinClient, type JellyfinClient } from './client.js';
import {
  getJellyfinSettingsFull,
  setJellyfinSettings,
  type JellyfinSettingsFull,
} from './repository.js';
import type { JellyfinMedia } from './transformers.js';
import { jellyfinItemToMedia } from './transformers.js';

export interface JellyfinContext {
  db: Database;
  log: FastifyBaseLogger;
}

export async function createJellyfinService(context: JellyfinContext) {
  const lifecycle = createClientLifecycle<JellyfinSettingsFull, JellyfinClient>({
    name: 'Jellyfin',
    loadSettings: () => getJellyfinSettingsFull(context.db),
    createClient: settings =>
      settings.jellyfinUrl && settings.jellyfinApiKey
        ? createJellyfinClient(settings.jellyfinUrl, settings.jellyfinApiKey)
        : undefined,
  });

  await lifecycle.reload().catch(() => {
    context.log.error({ name: 'Jellyfin' }, 'Failed to initialize Jellyfin service');
  });

  function getSettings() {
    const { jellyfinApiKey: _jellyfinApiKey, ...settings } = lifecycle.settings();
    return settings;
  }

  async function setSettings(settingsQuery: JellyfinSettingsQuery) {
    await setJellyfinSettings(context.db, settingsQuery);

    await lifecycle.reload();
    return getSettings();
  }

  async function testConnection(): Promise<boolean> {
    return lifecycle.testConnection();
  }

  function isConfigured() {
    return lifecycle.isConfigured();
  }

  async function listLibraryItems(): Promise<JellyfinMedia[]> {
    const currentClient = lifecycle.client();

    const allItems: JellyfinMedia[] = [];
    const limit = 100;
    let startIndex = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await currentClient.getItems({
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

    const tvSeries = allItems.filter(item => item.type === 'tv');

    await Promise.all(
      tvSeries.map(async item => {
        try {
          const seasonsResponse = await currentClient.getItems({
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
          // Ignore per-series season lookup failures and keep the rest of the sync moving.
        }
      })
    );

    return allItems;
  }

  async function resolveMediaUrl(mediaId: number): Promise<string | null> {
    const mediaRecord = await getMediaById(context.db, mediaId);
    if (!mediaRecord?.jellyfinId) return null;

    const { jellyfinUrl } = getSettings();
    if (!jellyfinUrl) return null;

    return `${trimTrailingSlash(jellyfinUrl)}/web/index.html?#/details?id=${mediaRecord.jellyfinId}`;
  }

  return {
    getSettings,
    setSettings,
    isConfigured,
    testConnection,
    listLibraryItems,
    resolveMediaUrl,
  };
}

export type JellyfinService = Awaited<ReturnType<typeof createJellyfinService>>;
