import { isDefined, type JellyfinSettingsQuery } from '@findarr/shared';
import type { DB } from '../db/setup.js';
import { getMediaById } from '../media/repository.js';
import { trimTrailingSlash } from '../utils/links.js';
import { createJellyfinClient, type JellyfinClient } from './client.js';
import {
  getJellyfinSettingsFull,
  setJellyfinSettings,
  type JellyfinSettingsFull,
} from './repository.js';
import type { JellyfinMedia } from './transformers.js';
import { jellyfinItemToMedia } from './transformers.js';

type RuntimeState = {
  settings?: JellyfinSettingsFull;
  client?: JellyfinClient | undefined;
};

export async function createJellyfinService(db: DB) {
  let state: RuntimeState = {};
  let reloadPromise: Promise<void> | undefined;

  await reload();

  async function reload(): Promise<void> {
    if (reloadPromise) return reloadPromise;

    reloadPromise = (async () => {
      const settings = await getJellyfinSettingsFull(db);
      const client =
        settings.jellyfinUrl && settings.jellyfinApiKey
          ? createJellyfinClient(settings.jellyfinUrl, settings.jellyfinApiKey)
          : undefined;

      state = { settings, client };
    })();

    try {
      await reloadPromise;
    } finally {
      reloadPromise = undefined;
    }
  }

  function requireClient(): JellyfinClient {
    if (!state.client) throw new Error('Jellyfin client is not configured');

    return state.client;
  }

  function requireSettings(): JellyfinSettingsFull {
    if (!state.settings) throw new Error('Jellyfin settings are unavailable');
    return state.settings;
  }

  function getSettings() {
    const { jellyfinApiKey: _jellyfinApiKey, ...settings } = requireSettings();
    return settings;
  }

  async function setSettings(settingsQuery: JellyfinSettingsQuery) {
    await setJellyfinSettings(db, settingsQuery);

    await reload();
    return getSettings();
  }

  async function testConnection(): Promise<boolean> {
    return state.client ? await state.client.testConnection() : false;
  }

  async function isConfigured(): Promise<boolean> {
    return !!state.client;
  }

  async function library(): Promise<JellyfinMedia[]> {
    if (!state.client) {
      return [];
    }

    const currentClient = requireClient();

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

  async function resolveUrl(mediaId: number): Promise<string | null> {
    const mediaRecord = await getMediaById(db, mediaId);
    if (!mediaRecord?.jellyfinId) return null;

    const { jellyfinUrl } = getSettings();
    if (!jellyfinUrl || !state.client) return null;

    return `${trimTrailingSlash(jellyfinUrl)}/web/index.html?#/details?id=${mediaRecord.jellyfinId}`;
  }

  return {
    getSettings,
    setSettings,
    isConfigured,
    testConnection,
    library,
    resolveUrl,
  };
}

export type JellyfinService = Awaited<ReturnType<typeof createJellyfinService>>;
