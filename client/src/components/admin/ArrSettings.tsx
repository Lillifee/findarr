import type {
  ArrQualityProfile,
  ArrRootFolder,
  ArrTestResult,
  JellyfinTestResult,
  RadarrSettings,
  SonarrSettings,
} from '@findarr/shared';
import { useState, useEffect, useCallback } from 'react';
import { adminArrService, adminJellyfinService } from '../../services/api';

const inputClass =
  'w-full p-2 border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm';
const readonlyClass =
  'w-full p-2 border border-gray-700 rounded bg-gray-700/50 text-gray-500 text-sm';

function formatBytes(bytes: number): string {
  const gb = bytes / 1024 ** 3;
  return `${gb.toFixed(1)} GB free`;
}

interface ArrSectionProps {
  service: 'radarr' | 'sonarr';
  title: string;
  description: string;
  accentColor: 'orange' | 'blue';
}

function ArrSection({ service, title, description, accentColor }: ArrSectionProps) {
  const svc = adminArrService[service];

  // Normalize prefixed settings fields to local names for the form
  type AnyArrSettings = RadarrSettings | SonarrSettings;
  const norm = (settings: AnyArrSettings) => ({
    url: (settings as Record<string, unknown>)[`${service}Url`] as string | null,
    apiKeySet: (settings as Record<string, unknown>)[`${service}ApiKeySet`] as boolean,
    qualityProfileId: (settings as Record<string, unknown>)[`${service}QualityProfileId`] as
      | number
      | null,
    rootFolderPath: (settings as Record<string, unknown>)[`${service}RootFolderPath`] as
      | string
      | null,
  });

  const defaultSettings: RadarrSettings = {
    radarrUrl: null,
    radarrApiKeySet: false,
    radarrQualityProfileId: null,
    radarrRootFolderPath: null,
  };

  const [settings, setSettings] = useState<AnyArrSettings>(defaultSettings);
  const [profiles, setProfiles] = useState<ArrQualityProfile[]>([]);
  const [rootFolders, setRootFolders] = useState<ArrRootFolder[]>([]);
  const [testResult, setTestResult] = useState<ArrTestResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [urlInput, setUrlInput] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [selectedRootFolder, setSelectedRootFolder] = useState('');

  // Connection settings changed (URL or API key) - requires re-test
  const connectionDirty =
    urlInput !== (settings ? (norm(settings).url ?? '') : '') || apiKeyInput !== '';

  // Any setting changed (including profile/folder) - enables save button
  const isDirty =
    connectionDirty ||
    selectedProfileId !== (norm(settings).qualityProfileId?.toString() ?? '') ||
    selectedRootFolder !== (norm(settings).rootFolderPath ?? '');

  const loadProfiles = useCallback(async () => {
    const [p, f] = await Promise.all([svc.getProfiles(), svc.getRootFolders()]);
    setProfiles(p);
    setRootFolders(f);
  }, [svc]);

  const init = useCallback(async () => {
    setIsLoading(true);
    try {
      const [currentSettings, result] = await Promise.all([svc.getSettings(), svc.test()]);
      setSettings(currentSettings);
      setTestResult(result);
      setUrlInput(norm(currentSettings).url ?? '');
      setSelectedProfileId(norm(currentSettings).qualityProfileId?.toString() ?? '');
      setSelectedRootFolder(norm(currentSettings).rootFolderPath ?? '');
      if (result.connected) await loadProfiles();
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [svc, loadProfiles]);

  useEffect(() => {
    void init();
  }, [init]);

  async function handleTest() {
    setIsTesting(true);
    setError('');
    try {
      const result = await svc.test();
      setTestResult(result);
      if (result.connected && profiles.length === 0) await loadProfiles();
    } catch {
      setError('Failed to test connection');
    } finally {
      setIsTesting(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (urlInput) body[`${service}Url`] = urlInput;
      if (apiKeyInput) body[`${service}ApiKey`] = apiKeyInput;
      if (selectedProfileId)
        body[`${service}QualityProfileId`] = Number.parseInt(selectedProfileId, 10);
      if (selectedRootFolder) body[`${service}RootFolderPath`] = selectedRootFolder;
      await svc.saveSettings(body as never);
      setApiKeyInput('');
      setSuccess('Settings saved');
      await init();
    } catch {
      setError('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  }

  const accentText = accentColor === 'orange' ? 'text-orange-400' : 'text-blue-400';
  const accentBorder = accentColor === 'orange' ? 'border-orange-500/30' : 'border-blue-500/30';
  const badgeBase = 'px-2 py-0.5 rounded text-xs font-medium';

  let statusBadge: React.ReactNode;
  if (isLoading) {
    statusBadge = <span className={`${badgeBase} bg-gray-700 text-gray-400`}>Checking…</span>;
  } else if (connectionDirty) {
    statusBadge = (
      <span className={`${badgeBase} bg-yellow-900/50 text-yellow-400 border border-yellow-700`}>
        Unsaved changes
      </span>
    );
  } else if (!testResult?.configured) {
    statusBadge = <span className={`${badgeBase} bg-gray-700 text-gray-400`}>Not configured</span>;
  } else if (testResult.connected) {
    statusBadge = (
      <span className={`${badgeBase} bg-green-900/50 text-green-400 border border-green-700`}>
        Connected
      </span>
    );
  } else {
    statusBadge = (
      <span className={`${badgeBase} bg-red-900/50 text-red-400 border border-red-700`}>
        Disconnected
      </span>
    );
  }

  return (
    <div className={`bg-gray-800 rounded-lg border ${accentBorder} p-5`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <h3 className={`text-lg font-semibold ${accentText}`}>{title}</h3>
        {statusBadge}
      </div>
      <p className="text-sm text-gray-400 -mt-3 mb-5">{description}</p>

      {testResult?.configured && !testResult.connected && (
        <div className="p-3 mb-4 bg-red-900/20 rounded text-sm text-red-400 border border-red-700/50">
          Could not reach {title}. Check the URL and API key.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {/* Server URL */}
        <div>
          <label className="block mb-1.5 text-sm text-gray-300">Server URL</label>
          <input
            type="url"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder="http://localhost:7878"
            className={inputClass}
          />
        </div>

        {/* API Key */}
        <div>
          <label className="block mb-1.5 text-sm text-gray-300">
            API Key
            {norm(settings).apiKeySet && !apiKeyInput && (
              <span className="ml-2 text-xs text-gray-500 font-normal">
                (already set — leave blank to keep)
              </span>
            )}
          </label>
          <input
            type="password"
            value={apiKeyInput}
            onChange={e => setApiKeyInput(e.target.value)}
            placeholder={norm(settings).apiKeySet ? '••••••••••••••••' : 'Enter API key'}
            autoComplete="new-password"
            className={inputClass}
          />
        </div>

        {/* Quality Profile */}
        <div>
          <label className="block mb-1.5 text-sm text-gray-300">Quality Profile</label>
          {!connectionDirty && testResult?.connected && profiles.length > 0 ? (
            <select
              value={selectedProfileId}
              onChange={e => setSelectedProfileId(e.target.value)}
              className={inputClass}
            >
              <option value="">— Select quality profile —</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id.toString()}>
                  {p.name}
                </option>
              ))}
            </select>
          ) : (
            <div className={readonlyClass}>
              {norm(settings).qualityProfileId
                ? `Profile ID: ${norm(settings).qualityProfileId}`
                : '— No profile selected —'}
            </div>
          )}
        </div>

        {/* Root Folder */}
        <div>
          <label className="block mb-1.5 text-sm text-gray-300">Root Folder</label>
          {!connectionDirty && testResult?.connected && rootFolders.length > 0 ? (
            <select
              value={selectedRootFolder}
              onChange={e => setSelectedRootFolder(e.target.value)}
              className={inputClass}
            >
              <option value="">— Select root folder —</option>
              {rootFolders.map(f => (
                <option key={f.id} value={f.path}>
                  {f.path}
                  {f.freeSpace == null ? '' : ` (${formatBytes(f.freeSpace)})`}
                </option>
              ))}
            </select>
          ) : (
            <div className={readonlyClass}>
              {norm(settings).rootFolderPath ?? '— No folder selected —'}
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-900/50 text-red-200 rounded border border-red-700 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-900/50 text-green-200 rounded border border-green-700 text-sm">
            {success}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isSaving || !isDirty}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium cursor-pointer"
          >
            {isSaving ? 'Saving…' : 'Save Settings'}
          </button>
          <button
            type="button"
            onClick={handleTest}
            disabled={isTesting || connectionDirty}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isTesting ? 'Testing…' : 'Test Connection'}
          </button>
        </div>
      </form>
    </div>
  );
}

function JellyfinSection() {
  const [testResult, setTestResult] = useState<JellyfinTestResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');

  const isDirty = urlInput !== (savedUrl ?? '') || apiKeyInput !== '';

  const init = useCallback(async () => {
    setIsLoading(true);
    try {
      const [settings, result] = await Promise.all([
        adminJellyfinService.getSettings(),
        adminJellyfinService.test(),
      ]);
      setSavedUrl(settings.jellyfinUrl);
      setUrlInput(settings.jellyfinUrl ?? '');
      setTestResult(result);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void init();
  }, [init]);

  async function handleTest() {
    setIsTesting(true);
    try {
      const result = await adminJellyfinService.test();
      setTestResult(result);
    } catch {
      // ignore
    } finally {
      setIsTesting(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);
    try {
      await adminJellyfinService.saveSettings({
        ...(urlInput ? { jellyfinUrl: urlInput } : {}),
        ...(apiKeyInput ? { jellyfinApiKey: apiKeyInput } : {}),
      });
      setApiKeyInput('');
      setSuccess('Settings saved');
      await init();
    } catch {
      setError('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  }

  const badgeBase = 'px-2 py-0.5 rounded text-xs font-medium';
  let statusBadge: React.ReactNode;
  if (isLoading) {
    statusBadge = <span className={`${badgeBase} bg-gray-700 text-gray-400`}>Checking…</span>;
  } else if (isDirty) {
    statusBadge = (
      <span className={`${badgeBase} bg-yellow-900/50 text-yellow-400 border border-yellow-700`}>
        Unsaved changes
      </span>
    );
  } else if (testResult?.connected) {
    statusBadge = (
      <span className={`${badgeBase} bg-green-900/50 text-green-400 border border-green-700`}>
        Connected
      </span>
    );
  } else {
    statusBadge = (
      <span className={`${badgeBase} bg-red-900/50 text-red-400 border border-red-700`}>
        Disconnected
      </span>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-purple-500/30 p-5">
      <div className="flex items-center gap-2 mb-5">
        <h3 className="text-lg font-semibold text-purple-400">Jellyfin</h3>
        {statusBadge}
      </div>
      <p className="text-sm text-gray-400 -mt-3 mb-5">
        Media server — tracks availability of requested content
      </p>

      {!isLoading && !isDirty && !testResult?.connected && (
        <div className="p-3 mb-4 bg-red-900/20 rounded text-sm text-red-400 border border-red-700/50">
          Could not reach Jellyfin. Check the URL and API key.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block mb-1.5 text-sm text-gray-300">Server URL</label>
          <input
            type="url"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder="http://localhost:8096"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block mb-1.5 text-sm text-gray-300">
            API Key
            {testResult?.apiKeySet && !apiKeyInput && (
              <span className="ml-2 text-xs text-gray-500 font-normal">
                (already set — leave blank to keep)
              </span>
            )}
          </label>
          <input
            type="password"
            value={apiKeyInput}
            onChange={e => setApiKeyInput(e.target.value)}
            placeholder={testResult?.apiKeySet ? '••••••••••••••••' : 'Enter API key'}
            autoComplete="new-password"
            className={inputClass}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-900/50 text-red-200 rounded border border-red-700 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-900/50 text-green-200 rounded border border-green-700 text-sm">
            {success}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isSaving || !isDirty}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium cursor-pointer"
          >
            {isSaving ? 'Saving…' : 'Save Settings'}
          </button>
          <button
            type="button"
            onClick={handleTest}
            disabled={isTesting || isDirty}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isTesting ? 'Testing…' : 'Test Connection'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ArrSettings() {
  return (
    <div className="p-4 md:p-5">
      <div className="mb-5">
        <h2 className="m-0 text-white text-xl md:text-2xl mb-1">Integrations</h2>
        <p className="text-gray-400 text-sm">
          Configure Jellyfin, Radarr, and Sonarr for automatic media management
        </p>
      </div>
      <div className="space-y-6">
        <JellyfinSection />
        <ArrSection
          service="radarr"
          title="Radarr"
          description="Movies — quality profile and root folder for new movie requests"
          accentColor="orange"
        />
        <ArrSection
          service="sonarr"
          title="Sonarr"
          description="TV Shows — quality profile and root folder for new series requests"
          accentColor="blue"
        />
      </div>
    </div>
  );
}
