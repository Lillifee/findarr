import type { JellyfinSettingsQuery } from '@findarr/shared/settings';
import { isDefined } from '@findarr/shared/utils';
import type { FastifyBaseLogger } from 'fastify';

import type { Database } from '../db/service.js';
import type { SchedulerService } from '../scheduler/service.js';
import { createClientLifecycle } from '../utils/clientLifecycleHepler.js';
import { trimTrailingSlash } from '../utils/links.js';
import { createJellyfinClient, type JellyfinClient } from './client.js';
import {
  getJellyfinSettingsFull,
  setJellyfinSettings,
  type JellyfinSettingsFull,
} from './repository.js';
import { jellyfinItemToMedia, type JellyfinMedia } from './transformers.js';

export interface JellyfinContext {
  db: Database;
  log: FastifyBaseLogger;
  scheduler: SchedulerService;
}

export async function createJellyfinService(context: JellyfinContext) {
  const lifecycle = createClientLifecycle<JellyfinSettingsFull, JellyfinClient>({
    name: 'Jellyfin',
    loadSettings: async () => getJellyfinSettingsFull(context.db),
    createClient: (settings) =>
      isDefined(settings.jellyfinUrl) && isDefined(settings.jellyfinApiKey)
        ? createJellyfinClient(settings.jellyfinUrl, settings.jellyfinApiKey, context.log)
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
    return lifecycle.isConfigured() && (await lifecycle.client().testConnection());
  }

  async function testAndSync(): Promise<boolean> {
    return (
      (await testConnection()) &&
      (await context.scheduler.trigger({ name: 'jellyfinLibrarySync' }), true)
    );
  }

  function isConfigured() {
    return lifecycle.isConfigured();
  }

  async function listLibraryItems(): Promise<JellyfinMedia[]> {
    const currentClient = lifecycle.client();
    const { jellyfinUrl } = getSettings();
    const baseUrl = isDefined(jellyfinUrl) ? trimTrailingSlash(jellyfinUrl) : '';

    const allItems: JellyfinMedia[] = [];
    const limit = 100;
    let startIndex = 0;
    let hasMore = true;

    while (hasMore) {
      // Sequential by design: cursor pagination.
      // oxlint-disable-next-line eslint/no-await-in-loop
      const response = await currentClient.getItems({
        itemTypes: ['Movie', 'Series'],
        startIndex,
        limit,
      });

      const transformed = response.Items.map((item) => jellyfinItemToMedia(item, baseUrl)).filter(
        (item) => isDefined(item),
      );

      allItems.push(...transformed);
      startIndex += response.Items.length;
      hasMore = startIndex < response.TotalRecordCount;
    }

    const tvSeries = allItems.filter((item) => item.type === 'tv');

    await Promise.all(
      tvSeries.map(async (item) => {
        try {
          const seasonsResponse = await currentClient.getItems({
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
          // Ignore per-series season lookup failures and keep the rest of the sync moving.
          context.log.debug(
            { name: 'jellyfin', libId: item.libId, err },
            'Season lookup failed, skipping',
          );
        }
      }),
    );

    return allItems;
  }

  return {
    getSettings,
    setSettings,
    isConfigured,
    testConnection,
    testAndSync,
    listLibraryItems,
  };
}

export type JellyfinService = Awaited<ReturnType<typeof createJellyfinService>>;
