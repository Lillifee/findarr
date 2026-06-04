import { isDefined } from '@findarr/shared';

type MaybePromise<T> = T | Promise<T>;

interface ServiceLifecycleOptions<TSettings, TClient> {
  name: string;
  loadSettings: () => Promise<TSettings>;
  createClient: (settings: TSettings) => TClient | undefined;
  onReloaded?: (state: { settings: TSettings; client: TClient | undefined }) => MaybePromise<void>;
}

type LifecycleState<TSettings, TClient> = {
  settings?: TSettings;
  client?: TClient | undefined;
};

export function createClientLifecycle<TSettings, TClient>(
  options: ServiceLifecycleOptions<TSettings, TClient>,
) {
  let state: LifecycleState<TSettings, TClient> = {};
  let reloadPromise: Promise<void> | undefined;

  async function reload(): Promise<void> {
    if (reloadPromise) {
      return reloadPromise;
    }

    reloadPromise = (async () => {
      const newSettings = await options.loadSettings();
      const newClient = options.createClient(newSettings);
      const newState = { settings: newSettings, client: newClient };

      state = newState;

      if (options.onReloaded) {
        await options.onReloaded(newState);
      }
    })();

    try {
      await reloadPromise;
    } finally {
      reloadPromise = undefined;
    }
  }

  function client(): TClient {
    if (!isDefined(state.client)) {
      throw new Error(`${options.name} client is not configured`);
    }
    return state.client;
  }

  function settings(): TSettings {
    if (!isDefined(state.settings)) {
      throw new Error(`${options.name} settings are unavailable`);
    }
    return state.settings;
  }

  function isConfigured(): boolean {
    return isDefined(state.client);
  }

  return {
    reload,
    client,
    settings,
    isConfigured,
  };
}
