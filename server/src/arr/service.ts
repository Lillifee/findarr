import type { ArrSettings, ArrSettingsQuery } from '@findarr/shared';
import type { FastifyBaseLogger } from 'fastify';
import type { Database } from '../db/service.js';
import { getMediaById } from '../media/repository.js';
import type { SchedulerService } from '../scheduler/service.js';
import { createClientLifecycle } from '../utils/clientLifecycleHepler.js';
import { trimTrailingSlash } from '../utils/links.js';
import { createArrClient, type ArrClient } from './client.js';
import { arrConfig, type ArrServiceConfig } from './config.js';
import {
  getArrSettings,
  setArrSettings,
  updateMediaIds,
  type ArrSettingsFull,
} from './repository.js';
import type { ArrLibraryItem, ArrQualityProfile, ArrQueueItem, ArrRootFolder } from './schemas.js';
import { transformArrMedia } from './transformers.js';

export interface ArrServiceContext {
  db: Database;
  log: FastifyBaseLogger;
  scheduler: SchedulerService;
}

export async function createArrService<T extends ArrServiceConfig>(
  config: T,
  context: ArrServiceContext
) {
  const lifecycle = createClientLifecycle<ArrSettingsFull, ArrClient>({
    name: config.service,
    loadSettings: () => getArrSettings(context.db, config),
    createClient: settings =>
      settings.url && settings.apiKey
        ? createArrClient(config, settings.url, settings.apiKey)
        : undefined,
  });

  await lifecycle.reload().catch(error => {
    context.log.error({ name: config.service, error }, 'Failed to initialize Arr service');
  });

  async function getSettings(): Promise<ArrSettings> {
    const { apiKey: _apiKey, ...settings } = lifecycle.settings();
    return settings;
  }

  async function setSettings(settingsQuery: ArrSettingsQuery): Promise<ArrSettings> {
    await setArrSettings(context.db, config, settingsQuery);

    await lifecycle.reload();
    return getSettings();
  }

  async function testConnection(): Promise<boolean> {
    return lifecycle.isConfigured() && (await lifecycle.client().testConnection());
  }

  async function testAndSync(): Promise<boolean> {
    return (
      (await testConnection()) &&
      (await context.scheduler.trigger({ name: config.syncScheduler }), true)
    );
  }

  async function isConfigured(): Promise<boolean> {
    return lifecycle.isConfigured();
  }

  async function requestMedia(
    mediaId: number,
    id: number | undefined,
    title: string,
    arrId?: number | null,
    seasons?: number[]
  ): Promise<ArrLibraryItem | undefined> {
    if (!lifecycle.isConfigured()) {
      return undefined;
    }

    // Only sonarr needs multiple requests to update shows.
    if (config.service === 'radarr' && arrId) {
      return undefined;
    }

    const client = lifecycle.client();
    const settings = lifecycle.settings();

    const { qualityProfileId, rootFolderPath } = settings;

    if (!qualityProfileId || !rootFolderPath) return undefined;

    const response = await client.requestOrUpdateMedia(
      { id, title, arrId },
      {
        qualityProfileId,
        rootFolderPath,
      },
      seasons
    );

    const libraryItem = transformArrMedia(response);

    await updateMediaIds(context.db, mediaId, {
      arrId: libraryItem.id,
      tmdbId: libraryItem.tmdbId,
      tvdbId: libraryItem.tvdbId,
      arrUrl: libraryItem.arrUrl,
    });

    // TODO we only need to trigger the scheduler if a new season is monitored.
    context.scheduler.start({ name: config.queueFastSyncScheduler });
    return libraryItem;
  }

  async function listQualityProfiles(): Promise<ArrQualityProfile[]> {
    return lifecycle.client().listQualityProfiles();
  }

  async function listRootFolders(): Promise<ArrRootFolder[]> {
    return lifecycle.client().listRootFolders();
  }

  async function listLibraryItems(): Promise<ArrLibraryItem[]> {
    const items = await lifecycle.client().listLibraryItems();
    return items.map(x => transformArrMedia(x));
  }

  async function getQueue(pageSize: number): Promise<ArrQueueItem[]> {
    return lifecycle.client().getQueue(pageSize);
  }

  async function resolveMediaUrl(mediaId: number): Promise<string | null> {
    const mediaRecord = await getMediaById(context.db, mediaId);

    if (!mediaRecord?.arrUrl) return null;

    const { url } = lifecycle.settings();
    if (!url) return null;

    return `${trimTrailingSlash(url)}${mediaRecord.arrUrl}`;
  }

  return {
    config,
    getSettings,
    setSettings,
    isConfigured,
    testConnection,
    testAndSync,
    requestMedia,
    listQualityProfiles,
    listRootFolders,
    listLibraryItems,
    getQueue,
    resolveMediaUrl,
  };
}

export type ArrService<T extends ArrServiceConfig = ArrServiceConfig> = Awaited<
  ReturnType<typeof createArrService<T>>
>;

export type AnyArrService =
  | ArrService<typeof arrConfig.radarr>
  | ArrService<typeof arrConfig.sonarr>;
