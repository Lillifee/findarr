import type { PlexSettingsQuery } from '@findarr/shared/settings';
import { isDefined } from '@findarr/shared/utils';
import type { FastifyBaseLogger } from 'fastify';

import type { Database } from '../db/service.js';
import type { SchedulerService } from '../scheduler/service.js';
import { createClientLifecycle } from '../utils/clientLifecycleHepler.js';
import { trimTrailingSlash } from '../utils/links.js';
import { createPlexClient, type PlexClient } from './client.js';
import { getPlexSettingsFull, setPlexSettings, type PlexSettingsFull } from './repository.js';
import { plexItemToMedia, type PlexMedia } from './transformers.js';

export interface PlexContext {
  db: Database;
  log: FastifyBaseLogger;
  scheduler: SchedulerService;
}

export async function createPlexService(context: PlexContext) {
  const lifecycle = createClientLifecycle<PlexSettingsFull, PlexClient>({
    name: 'Plex',
    loadSettings: async () => getPlexSettingsFull(context.db),
    createClient: (settings) =>
      isDefined(settings.plexUrl) && isDefined(settings.plexToken)
        ? createPlexClient(settings.plexUrl, settings.plexToken, context.log)
        : undefined,
  });

  await lifecycle.reload().catch(() => {
    context.log.error({ name: 'plex' }, 'Failed to initialize Plex service');
  });

  function getSettings() {
    const { plexToken: _plexToken, ...settings } = lifecycle.settings();
    return settings;
  }

  async function setSettings(settingsQuery: PlexSettingsQuery) {
    await setPlexSettings(context.db, settingsQuery);
    await lifecycle.reload();
    return getSettings();
  }

  async function testConnection(): Promise<boolean> {
    return lifecycle.isConfigured() && (await lifecycle.client().testConnection());
  }

  async function testAndSync(): Promise<boolean> {
    return (
      (await testConnection()) &&
      (await context.scheduler.trigger({ name: 'plexLibrarySync' }), true)
    );
  }

  function isConfigured() {
    return lifecycle.isConfigured();
  }

  async function listLibraryItems(): Promise<PlexMedia[]> {
    const currentClient = lifecycle.client();
    const { plexUrl } = getSettings();

    const baseUrl = isDefined(plexUrl) ? trimTrailingSlash(plexUrl) : '';

    const machineIdentifier = await currentClient.getMachineIdentifier();
    const sections = await currentClient.getSections();

    const allItems: PlexMedia[] = [];

    await Promise.all(
      sections.map(async (section) => {
        try {
          const pageSize = 100;
          let start = 0;
          let total = Infinity;

          while (start < total) {
            // Sequential cursor pagination per section.
            // oxlint-disable-next-line eslint/no-await-in-loop
            const { items, total: fetchedTotal } = await currentClient.getSectionItems(
              section.key,
              start,
              pageSize,
            );

            total = fetchedTotal;
            const transformed = items
              .map((item) => plexItemToMedia(item, baseUrl, machineIdentifier))
              .filter((item) => isDefined(item));

            allItems.push(...transformed);
            start += items.length;
            if (items.length === 0) {
              break;
            }
          }
        } catch (err) {
          context.log.warn(
            { name: 'plex', sectionKey: section.key, sectionTitle: section.title, err },
            'Failed to fetch section items, skipping',
          );
        }
      }),
    );

    const tvSeries = allItems.filter((item) => item.type === 'tv');

    await Promise.all(
      tvSeries.map(async (item) => {
        try {
          const seasons = await currentClient.getChildSeasons(item.libId);
          const seasonNumbers = seasons
            .filter((s) => isDefined(s.index) && s.index > 0)
            .map((s) => s.index ?? 0);

          if (seasonNumbers.length > 0) {
            item.availableSeasons = seasonNumbers;
          }
        } catch (err) {
          context.log.debug(
            { name: 'plex', libId: item.libId, err },
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

export type PlexService = Awaited<ReturnType<typeof createPlexService>>;
