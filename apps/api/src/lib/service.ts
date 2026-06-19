import type { LibSettings, LibSettingsQuery } from '@findarr/shared/settings';
import { isDefined } from '@findarr/shared/utils';
import type { FastifyBaseLogger } from 'fastify';

import type { Database } from '../db/service.js';
import type { SchedulerService } from '../scheduler/service.js';
import { createClientLifecycle } from '../utils/clientLifecycleHepler.js';
import { trimTrailingSlash } from '../utils/links.js';
import type { LibServiceConfig } from './config.js';
import { createJellyfinLibClient } from './jellyfin/client.js';
import { createPlexLibClient } from './plex/client.js';
import { getLibSettings, setLibSettings } from './repository.js';
import type { LibClient, LibMedia, LibSettingsFull } from './types.js';

const clientFactories: Record<
  string,
  (url: string, credential: string, log: FastifyBaseLogger) => LibClient
> = {
  jellyfin: createJellyfinLibClient,
  plex: createPlexLibClient,
};

export interface LibServiceContext {
  db: Database;
  log: FastifyBaseLogger;
  scheduler: SchedulerService;
}

export async function createLibService(config: LibServiceConfig, context: LibServiceContext) {
  const lifecycle = createClientLifecycle<LibSettingsFull, LibClient>({
    name: config.service,
    loadSettings: async () => getLibSettings(context.db, config),
    createClient: (settings): LibClient | undefined => {
      if (!settings.enabled) {
        return undefined;
      }
      const factory = clientFactories[config.service];
      return factory && isDefined(settings.url) && isDefined(settings.apiKey)
        ? factory(settings.url, settings.apiKey, context.log)
        : undefined;
    },
  });

  await lifecycle.reload().catch(() => {
    context.log.error({ name: config.service }, `Failed to initialize ${config.service} service`);
  });

  function getSettings(): LibSettings {
    const { apiKey: _apiKey, ...settings } = lifecycle.settings();
    return settings;
  }

  async function updateSchedulers() {
    const enabled = lifecycle.isConfigured();
    context.scheduler.setState({ name: config.syncScheduler, enabled });
    context.scheduler.setState({ name: config.queueSyncScheduler, enabled });
  }

  async function setSettings(query: LibSettingsQuery): Promise<LibSettings> {
    await setLibSettings(context.db, config, query);
    await lifecycle.reload();
    await updateSchedulers();
    return getSettings();
  }

  function isConfigured(): boolean {
    return lifecycle.isConfigured();
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

  async function listLibraryItems(): Promise<LibMedia[]> {
    const { url } = getSettings();
    const baseUrl = isDefined(url) ? trimTrailingSlash(url) : '';
    return lifecycle.client().listLibraryItems(baseUrl);
  }

  return {
    config,
    getSettings,
    setSettings,
    isConfigured,
    testConnection,
    testAndSync,
    listLibraryItems,
  };
}

export type LibService = Awaited<ReturnType<typeof createLibService>>;
