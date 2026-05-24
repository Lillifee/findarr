type MaybePromise<T> = T | Promise<T>;

interface ServiceLifecycleOptions<
  TSettings,
  TClient extends { testConnection(): Promise<boolean> },
> {
  name: string;
  loadSettings: () => Promise<TSettings>;
  createClient: (settings: TSettings) => TClient | undefined;
  onReloaded?: (state: { settings: TSettings; client: TClient | undefined }) => MaybePromise<void>;
}

type LifecycleState<TSettings, TClient> = {
  settings?: TSettings;
  client?: TClient | undefined;
};

export function createClientLifecycle<
  TSettings,
  TClient extends { testConnection(): Promise<boolean> },
>(options: ServiceLifecycleOptions<TSettings, TClient>) {
  let state: LifecycleState<TSettings, TClient> = {};
  let reloadPromise: Promise<void> | undefined;

  async function reload(): Promise<void> {
    if (reloadPromise) return reloadPromise;

    reloadPromise = (async () => {
      const settings = await options.loadSettings();
      const client = options.createClient(settings);

      state = { settings, client };

      if (options.onReloaded) {
        await options.onReloaded({ settings, client });
      }
    })();

    try {
      await reloadPromise;
    } finally {
      reloadPromise = undefined;
    }
  }

  function client(): TClient {
    if (!state.client) throw new Error(`${options.name} client is not configured`);
    return state.client;
  }

  function settings(): TSettings {
    if (!state.settings) throw new Error(`${options.name} settings are unavailable`);
    return state.settings;
  }

  function isConfigured(): boolean {
    return !!state.client;
  }

  async function testConnection(): Promise<boolean> {
    return state.client ? await state.client.testConnection() : false;
  }

  return {
    reload,
    client,
    settings,
    isConfigured,
    testConnection,
  };
}
