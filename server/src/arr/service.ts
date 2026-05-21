import type { ArrSettings, ArrSettingsQuery } from '@findarr/shared';
import type { FastifyInstance } from 'fastify';
import type { DB } from '../db/setup.js';
import { getMediaById } from '../media/repository.js';
import { trimTrailingSlash } from '../utils/links.js';
import { createArrClient, type ArrClient } from './client.js';
import { arrConfig, type ArrServiceConfig } from './config.js';
import {
  getArrSettings,
  setArrSettings,
  updateMediaIds,
  type ArrSettingsFull,
} from './repository.js';
import type {
  ArrLibraryItem,
  ArrQualityProfile,
  ArrQueueResponse,
  ArrRootFolder,
} from './schemas.js';
import { transformArrMedia } from './transformers.js';

type RuntimeState = {
  settings?: ArrSettingsFull;
  client?: ArrClient | undefined;
};

export async function createArrService<T extends ArrServiceConfig>(
  db: DB,
  config: T,
  fastify: FastifyInstance
) {
  let state: RuntimeState = {};
  let reloadPromise: Promise<void> | undefined;

  await reload();

  async function reload(): Promise<void> {
    if (reloadPromise) return reloadPromise;

    reloadPromise = (async () => {
      const settings = await getArrSettings(db, config);
      const client =
        settings.url && settings.apiKey
          ? createArrClient(config, settings.url, settings.apiKey)
          : undefined;

      state = { settings, client };
    })();

    try {
      await reloadPromise;
    } finally {
      reloadPromise = undefined;
    }
  }

  function requireClient(): ArrClient {
    if (!state.client) throw new Error(`${config.service} client is not configured`);
    return state.client;
  }

  function requireSettings(): ArrSettingsFull {
    if (!state.settings) throw new Error(`${config.service} settings are unavailable`);
    return state.settings;
  }

  async function getSettings(): Promise<ArrSettings> {
    const { apiKey: _apiKey, ...settings } = requireSettings();
    return settings;
  }

  async function setSettings(settingsQuery: ArrSettingsQuery): Promise<ArrSettings> {
    await setArrSettings(db, config, settingsQuery);

    await reload();
    return getSettings();
  }

  async function testConnection(): Promise<boolean> {
    return state.client ? await state.client.testConnection() : false;
  }

  async function isConfigured(): Promise<boolean> {
    return !!state.client;
  }

  async function request(
    mediaId: number,
    id: number | undefined,
    title: string,
    arrId?: number | null,
    seasons?: number[]
  ): Promise<ArrLibraryItem | undefined> {
    // Only sonarr needs multiple requests to update shows.
    if (config.service === 'radarr' && arrId) {
      return undefined;
    }

    const client = requireClient();
    const settings = requireSettings();

    const { qualityProfileId, rootFolderPath } = settings;

    if (!qualityProfileId || !rootFolderPath) return undefined;

    const response = await client.requestOrUpdate(
      { id, title, arrId },
      {
        qualityProfileId,
        rootFolderPath,
      },
      seasons
    );

    const libraryItem = transformArrMedia(response);

    await updateMediaIds(db, mediaId, {
      arrId: libraryItem.id,
      tmdbId: libraryItem.tmdbId,
      tvdbId: libraryItem.tvdbId,
      arrUrl: libraryItem.arrUrl,
    });

    fastify.scheduler.start({ name: config.queueFastSyncScheduler });
    return libraryItem;
  }

  async function profiles(): Promise<ArrQualityProfile[]> {
    return requireClient().getQualityProfiles();
  }

  async function rootFolders(): Promise<ArrRootFolder[]> {
    return requireClient().getRootFolders();
  }

  async function library(): Promise<ArrLibraryItem[]> {
    const items = await requireClient().getLibrary();
    return items.map(x => transformArrMedia(x));
  }

  async function queue(): Promise<ArrQueueResponse> {
    return requireClient().getQueue();
  }

  async function resolveUrl(mediaId: number): Promise<string | null> {
    const mediaRecord = await getMediaById(db, mediaId);

    if (!mediaRecord?.arrUrl) return null;

    const { url } = requireSettings();
    if (!url) return null;

    return `${trimTrailingSlash(url)}${mediaRecord.arrUrl}`;
  }

  return {
    config,
    getSettings,
    setSettings,
    isConfigured,
    testConnection,
    request,
    profiles,
    rootFolders,
    library,
    queue,
    resolveUrl,
  };
}

export type ArrService<T extends ArrServiceConfig = ArrServiceConfig> = Awaited<
  ReturnType<typeof createArrService<T>>
>;

export type AnyArrService =
  | ArrService<typeof arrConfig.radarr>
  | ArrService<typeof arrConfig.sonarr>;
