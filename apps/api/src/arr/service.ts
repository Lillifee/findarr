import type { ArrSettings, ArrSettingsQuery } from '@findarr/shared/settings';
import { isDefined } from '@findarr/shared/utils';

import type { Database } from '../db/service.js';
import type { SchedulerService } from '../scheduler/service.js';
import { createClientLifecycle } from '../utils/clientLifecycleHelper.js';
import { trimTrailingSlash } from '../utils/links.js';
import type { AppLogger } from '../utils/logger.js';
import { createArrClient, type ArrClient } from './client.js';
import type { arrConfig, ArrServiceConfig } from './config.js';
import { getArrSettings, setArrSettings, updateMediaIds } from './repository.js';
import type { ArrLibraryItem, ArrQualityProfile, ArrQueueItem, ArrRootFolder } from './schemas.js';
import { transformArrMedia } from './transformers.js';
import type { ArrSettingsFull } from './types.js';

export interface ArrServiceContext {
  db: Database;
  appLog: AppLogger;
  scheduler: SchedulerService;
}

export async function createArrService<T extends ArrServiceConfig>(
  config: T,
  context: ArrServiceContext,
) {
  const lifecycle = createClientLifecycle<ArrSettingsFull, ArrClient>({
    name: config.service,
    loadSettings: async () => getArrSettings(context.db, config),
    createClient: (settings) =>
      settings.enabled && isDefined(settings.url) && isDefined(settings.apiKey)
        ? createArrClient(config, settings.url, settings.apiKey, context.appLog)
        : undefined,
  });

  await lifecycle.reload().catch((error: unknown) => {
    context.appLog.scope(config.service).error({ error }, 'Failed to initialize Arr service');
  });

  function getSettings(): ArrSettings {
    const { apiKey: _apiKey, ...settings } = lifecycle.settings();
    return settings;
  }

  async function updateSchedulers() {
    const enabled = lifecycle.isConfigured();
    context.scheduler.setState({ name: config.syncScheduler, enabled });
    context.scheduler.setState({ name: config.queueMonitorScheduler, enabled });
  }

  async function setSettings(settingsQuery: ArrSettingsQuery): Promise<ArrSettings> {
    await setArrSettings(context.db, config, settingsQuery);
    await lifecycle.reload();
    await updateSchedulers();
    return getSettings();
  }

  async function testConnection(): Promise<boolean> {
    return lifecycle.isConfigured() && (await lifecycle.client().testConnection());
  }

  async function testAndSync(): Promise<boolean> {
    if (!(await testConnection())) {
      return false;
    }

    await updateSchedulers();
    await context.scheduler.trigger({ name: config.syncScheduler });

    return true;
  }

  function isConfigured(): boolean {
    return lifecycle.isConfigured();
  }

  async function requestMedia(
    mediaId: number,
    id: number | undefined,
    title: string,
    arrId?: number | null,
    seasons?: number[],
  ): Promise<ArrLibraryItem | undefined> {
    if (!lifecycle.isConfigured()) {
      return undefined;
    }

    // Only sonarr needs multiple requests to update shows.
    if (config.service === 'radarr' && isDefined(arrId)) {
      return undefined;
    }

    const client = lifecycle.client();
    const settings = lifecycle.settings();

    const { qualityProfileId, rootFolderPath } = settings;

    if (!isDefined(qualityProfileId) || !isDefined(rootFolderPath)) {
      return undefined;
    }

    const response = await client.requestOrUpdateMedia(
      { id, title, arrId },
      {
        qualityProfileId,
        rootFolderPath,
      },
      seasons,
    );

    const libraryItem = transformArrMedia(response, trimTrailingSlash(settings.url ?? ''));

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
    const { url } = lifecycle.settings();
    const baseUrl = isDefined(url) ? trimTrailingSlash(url) : '';
    const items = await lifecycle.client().listLibraryItems();
    return items.map((x) => transformArrMedia(x, baseUrl));
  }

  async function getQueue(pageSize: number): Promise<ArrQueueItem[]> {
    return lifecycle.client().getQueue(pageSize);
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
  };
}

export type ArrService<T extends ArrServiceConfig = ArrServiceConfig> = Awaited<
  ReturnType<typeof createArrService<T>>
>;

export type AnyArrService =
  | ArrService<typeof arrConfig.radarr>
  | ArrService<typeof arrConfig.sonarr>;
