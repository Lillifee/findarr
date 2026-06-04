import type { ArrSettings, ArrQualityProfile, ArrRootFolder } from '@findarr/shared/settings';
import { isDefined } from '@findarr/shared/utils';
import { useState, useEffect, useCallback } from 'react';

import { useAuth } from '../../hooks/useAuth';
import { adminArrService, adminJellyfinService, adminTmdbService } from '../../services/api';
import { asVoid } from '../../utils/asyncHandlers';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { PageHeader } from '../ui/PageHeader';
import { SelectInput } from '../ui/SelectInput';

const readonlyClass =
  'w-full min-h-10 rounded-lg border border-gray-700/50 bg-gray-800/60 px-3.5 py-2 text-sm text-gray-500';

type FeedbackTone = 'error' | 'success';

function InlineFeedback({ tone, message }: { tone: FeedbackTone; message: string }) {
  const toneClass =
    tone === 'error' ? 'border-red-800/60 text-red-300' : 'border-emerald-800/60 text-emerald-300';
  const dotClass = tone === 'error' ? 'bg-red-400' : 'bg-emerald-400';

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border border-dashed bg-gray-900/30 px-3 py-2 text-sm ${toneClass}`}
    >
      <span className={`h-2 w-2 flex-none rounded-full ${dotClass}`} aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

function StepPanel({
  title,
  message,
  children,
}: React.PropsWithChildren<{ title: string; message: string }>) {
  return (
    <div className="space-y-4 rounded-xl border border-gray-700/50 bg-gray-900/30 p-4">
      <div className="space-y-1">
        <p className="text-xs font-semibold tracking-[0.18em] text-gray-500 uppercase">{title}</p>
        <p className="text-sm text-gray-300">{message}</p>
      </div>
      {children}
    </div>
  );
}

function formatBytes(bytes: number): string {
  const gb = bytes / 1024 ** 3;
  return `${gb.toFixed(1)} GB free`;
}

interface ArrSectionProps {
  service: 'radarr' | 'sonarr';
  title: string;
  description: string;
}

function ArrSection({ service, title, description }: ArrSectionProps) {
  const svc = adminArrService[service];

  const defaultSettings: ArrSettings = {
    url: null,
    apiKeySet: false,
    qualityProfileId: null,
    rootFolderPath: null,
  };

  const [settings, setSettings] = useState<ArrSettings>(defaultSettings);
  const [profiles, setProfiles] = useState<ArrQualityProfile[]>([]);
  const [rootFolders, setRootFolders] = useState<ArrRootFolder[]>([]);
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [urlInput, setUrlInput] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [selectedRootFolder, setSelectedRootFolder] = useState('');
  const normalizedSettings = settings;

  function clearFeedback() {
    setError('');
    setSuccess('');
  }

  function handleUrlChange(value: string) {
    clearFeedback();
    setUrlInput(value);
  }

  function handleApiKeyChange(value: string) {
    clearFeedback();
    setApiKeyInput(value);
  }

  function handleProfileChange(value: string) {
    clearFeedback();
    setSelectedProfileId(value);
  }

  function handleRootFolderChange(value: string) {
    clearFeedback();
    setSelectedRootFolder(value);
  }

  // Connection settings changed (URL or API key) - requires re-test
  const connectionDirty = urlInput !== (normalizedSettings.url ?? '') || apiKeyInput !== '';

  // Any setting changed (including profile/folder) - enables save button
  const isDirty =
    connectionDirty ||
    selectedProfileId !== (normalizedSettings.qualityProfileId?.toString() ?? '') ||
    selectedRootFolder !== (normalizedSettings.rootFolderPath ?? '');
  const hasSavedConnectionSettings =
    isDefined(normalizedSettings.url) && normalizedSettings.apiKeySet;
  const canTestConnection = hasSavedConnectionSettings && !connectionDirty;
  const connectionEstablished = canTestConnection && Boolean(testResult);
  const feedback = error
    ? { tone: 'error' as const, message: error }
    : success
      ? { tone: 'success' as const, message: success }
      : null;

  const loadProfiles = useCallback(async () => {
    const [p, f] = await Promise.all([svc.listQualityProfiles(), svc.listRootFolders()]);
    setProfiles(p);
    setRootFolders(f);
  }, [svc]);

  const init = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentSettings = await svc.getSettings();
      const current = currentSettings;

      setSettings(currentSettings);
      setUrlInput(current.url ?? '');
      setSelectedProfileId(current.qualityProfileId?.toString() ?? '');
      setSelectedRootFolder(current.rootFolderPath ?? '');
      setTestResult(null);
      setProfiles([]);
      setRootFolders([]);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [svc]);

  useEffect(() => {
    void init();
  }, [init]);

  async function handleTest() {
    setIsTesting(true);
    setError('');
    setSuccess('');
    try {
      const result = await svc.test();
      setTestResult(result);
      if (result) {
        await loadProfiles();
        setSuccess('Connection successful. Quality profiles and root folders are ready.');
      } else {
        setProfiles([]);
        setRootFolders([]);
        setError(`Could not reach ${title}. Check the URL and API key, then test again.`);
      }
    } catch {
      setError('Failed to test connection');
    } finally {
      setIsTesting(false);
    }
  }

  async function handleSave(e: React.ChangeEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);
    try {
      const changedConnectionSettings = connectionDirty;
      const body: Record<string, unknown> = {};
      if (urlInput) {
        body['url'] = urlInput;
      }
      if (apiKeyInput) {
        body['apiKey'] = apiKeyInput;
      }
      if (selectedProfileId) {
        body['qualityProfileId'] = Number.parseInt(selectedProfileId, 10);
      }
      if (selectedRootFolder) {
        body['rootFolderPath'] = selectedRootFolder;
      }
      const savedSettings = await svc.saveSettings(body);
      const saved = savedSettings;

      setSettings(savedSettings);
      setUrlInput(saved.url ?? '');
      setSelectedProfileId(saved.qualityProfileId?.toString() ?? '');
      setSelectedRootFolder(saved.rootFolderPath ?? '');
      setApiKeyInput('');

      if (changedConnectionSettings) {
        setTestResult(null);
        setProfiles([]);
        setRootFolders([]);
      }
    } catch {
      setError('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  }

  const badgeBase = 'px-2 py-0.5 rounded text-xs font-medium';

  let statusBadge: React.ReactNode;
  if (isLoading) {
    statusBadge = <span className={`${badgeBase} bg-gray-700 text-gray-400`}>Loading…</span>;
  } else if (connectionDirty) {
    statusBadge = (
      <span className={`${badgeBase} border border-yellow-700 bg-yellow-900/50 text-yellow-400`}>
        Unsaved changes
      </span>
    );
  } else if (!hasSavedConnectionSettings) {
    statusBadge = <span className={`${badgeBase} bg-gray-700 text-gray-400`}>Not configured</span>;
  } else if (!isDefined(testResult)) {
    statusBadge = (
      <span className={`${badgeBase} border border-blue-700/70 bg-blue-900/40 text-blue-300`}>
        Ready to test
      </span>
    );
  } else if (testResult) {
    statusBadge = (
      <span className={`${badgeBase} border border-green-700 bg-green-900/50 text-green-400`}>
        Connected
      </span>
    );
  } else {
    statusBadge = (
      <span className={`${badgeBase} border border-red-700 bg-red-900/50 text-red-400`}>
        Disconnected
      </span>
    );
  }

  return (
    <Card variant="solid" padding="md">
      {/* Header */}
      <div className="mb-5 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {statusBadge}
      </div>
      <p className="-mt-3 mb-5 text-sm text-gray-400">{description}</p>

      <form onSubmit={asVoid(handleSave)} className="space-y-4">
        <div className="grid gap-5 xl:grid-cols-2 xl:items-start">
          <StepPanel
            title="Step 1"
            message="Save the server URL and API key before testing the connection."
          >
            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Server URL</label>
              <Input
                type="url"
                value={urlInput}
                onChange={(e) => {
                  handleUrlChange(e.target.value);
                }}
                placeholder="http://localhost:7878"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-gray-300">
                API Key
                {normalizedSettings.apiKeySet && !apiKeyInput && (
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    (already set — leave blank to keep)
                  </span>
                )}
              </label>
              <Input
                type="password"
                value={apiKeyInput}
                onChange={(e) => {
                  handleApiKeyChange(e.target.value);
                }}
                placeholder={normalizedSettings.apiKeySet ? '••••••••••••••••' : 'Enter API key'}
                autoComplete="new-password"
              />
            </div>
          </StepPanel>

          <StepPanel
            title="Step 2"
            message="Choose the quality profile and root folder for new requests."
          >
            {/* Quality Profile */}
            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Quality Profile</label>
              {connectionEstablished && profiles.length > 0 ? (
                <SelectInput
                  value={selectedProfileId}
                  onChange={(e) => {
                    handleProfileChange(e.target.value);
                  }}
                >
                  <option value="">— Select quality profile —</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id.toString()}>
                      {p.name}
                    </option>
                  ))}
                </SelectInput>
              ) : (
                <div className={`${readonlyClass} flex items-center`}>
                  Available after a successful connection test.
                </div>
              )}
            </div>

            {/* Root Folder */}
            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Root Folder</label>
              {connectionEstablished && rootFolders.length > 0 ? (
                <SelectInput
                  value={selectedRootFolder}
                  onChange={(e) => {
                    handleRootFolderChange(e.target.value);
                  }}
                >
                  <option value="">— Select root folder —</option>
                  {rootFolders.map((f) => (
                    <option key={f.id} value={f.path}>
                      {f.path}
                      {isDefined(f.freeSpace) ? ` (${formatBytes(f.freeSpace)})` : ''}
                    </option>
                  ))}
                </SelectInput>
              ) : (
                <div className={`${readonlyClass} flex items-center`}>
                  Available after a successful connection test.
                </div>
              )}
            </div>
          </StepPanel>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-800/80 pt-4 sm:flex-row sm:items-start sm:gap-4">
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isSaving || !isDirty} size="sm">
              {isSaving ? 'Saving…' : 'Save Settings'}
            </Button>
            {canTestConnection && (
              <Button
                type="button"
                onClick={asVoid(handleTest)}
                disabled={isTesting}
                variant="secondary"
                size="sm"
              >
                {isTesting
                  ? 'Testing…'
                  : isDefined(testResult)
                    ? 'Synchronize'
                    : 'Test & Synchronize'}
              </Button>
            )}
          </div>

          <div className="sm:min-h-10 sm:flex-1">
            {feedback && <InlineFeedback tone={feedback.tone} message={feedback.message} />}
          </div>
        </div>
      </form>
    </Card>
  );
}

function JellyfinSection() {
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [savedApiKeySet, setSavedApiKeySet] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');

  function clearFeedback() {
    setError('');
    setSuccess('');
  }

  function handleUrlChange(value: string) {
    clearFeedback();
    setUrlInput(value);
  }

  function handleApiKeyChange(value: string) {
    clearFeedback();
    setApiKeyInput(value);
  }

  const isDirty = urlInput !== (savedUrl ?? '') || apiKeyInput !== '';
  const hasSavedSettings = isDefined(savedUrl) && savedApiKeySet;
  const canTestConnection = hasSavedSettings && !isDirty;
  const feedback = error
    ? { tone: 'error' as const, message: error }
    : success
      ? { tone: 'success' as const, message: success }
      : null;

  const init = useCallback(async () => {
    setIsLoading(true);
    try {
      const settings = await adminJellyfinService.getSettings();

      setSavedUrl(settings.jellyfinUrl);
      setSavedApiKeySet(settings.jellyfinApiKeySet);
      setUrlInput(settings.jellyfinUrl ?? '');
      setTestResult(null);
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
    setError('');
    setSuccess('');
    try {
      const result = await adminJellyfinService.test();
      setTestResult(result);
      if (result) {
        setSuccess('Connection successful. Jellyfin is ready.');
      } else {
        setError('Could not reach Jellyfin. Check the URL and API key, then test again.');
      }
    } catch {
      setError('Failed to test connection');
    } finally {
      setIsTesting(false);
    }
  }

  async function handleSave(e: React.ChangeEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);
    try {
      const changedConnectionSettings = isDirty;
      const savedSettings = await adminJellyfinService.saveSettings({
        ...(urlInput ? { jellyfinUrl: urlInput } : {}),
        ...(apiKeyInput ? { jellyfinApiKey: apiKeyInput } : {}),
      });

      setSavedUrl(savedSettings.jellyfinUrl);
      setSavedApiKeySet(savedSettings.jellyfinApiKeySet);
      setUrlInput(savedSettings.jellyfinUrl ?? '');
      setApiKeyInput('');

      if (changedConnectionSettings) {
        setTestResult(null);
      }
    } catch {
      setError('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  }

  const badgeBase = 'px-2 py-0.5 rounded text-xs font-medium';
  let statusBadge: React.ReactNode;
  if (isLoading) {
    statusBadge = <span className={`${badgeBase} bg-gray-700 text-gray-400`}>Loading…</span>;
  } else if (isDirty) {
    statusBadge = (
      <span className={`${badgeBase} border border-yellow-700 bg-yellow-900/50 text-yellow-400`}>
        Unsaved changes
      </span>
    );
  } else if (!hasSavedSettings) {
    statusBadge = <span className={`${badgeBase} bg-gray-700 text-gray-400`}>Not configured</span>;
  } else if (!isDefined(testResult)) {
    statusBadge = (
      <span className={`${badgeBase} border border-blue-700/70 bg-blue-900/40 text-blue-300`}>
        Ready to test
      </span>
    );
  } else if (testResult) {
    statusBadge = (
      <span className={`${badgeBase} border border-green-700 bg-green-900/50 text-green-400`}>
        Connected
      </span>
    );
  } else {
    statusBadge = (
      <span className={`${badgeBase} border border-red-700 bg-red-900/50 text-red-400`}>
        Disconnected
      </span>
    );
  }

  return (
    <Card variant="solid" padding="md">
      <div className="mb-5 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-white">Jellyfin</h3>
        {statusBadge}
      </div>
      <p className="-mt-3 mb-5 text-sm text-gray-400">
        Media server — tracks availability of requested content
      </p>

      <form onSubmit={asVoid(handleSave)} className="space-y-4">
        <StepPanel
          title="Step 1"
          message="Save the server URL and API key before testing the connection."
        >
          <div>
            <label className="mb-1.5 block text-sm text-gray-300">Server URL</label>
            <Input
              type="url"
              value={urlInput}
              onChange={(e) => {
                handleUrlChange(e.target.value);
              }}
              placeholder="http://localhost:8096"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-gray-300">
              API Key
              {savedApiKeySet && !apiKeyInput && (
                <span className="ml-2 text-xs font-normal text-gray-500">
                  (already set — leave blank to keep)
                </span>
              )}
            </label>
            <Input
              type="password"
              value={apiKeyInput}
              onChange={(e) => {
                handleApiKeyChange(e.target.value);
              }}
              placeholder={savedApiKeySet ? '••••••••••••••••' : 'Enter API key'}
              autoComplete="new-password"
            />
          </div>
        </StepPanel>

        <div className="flex flex-col gap-3 border-t border-gray-800/80 pt-4 sm:flex-row sm:items-start sm:gap-4">
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isSaving || !isDirty} size="sm">
              {isSaving ? 'Saving…' : 'Save Settings'}
            </Button>
            {canTestConnection && (
              <Button
                type="button"
                onClick={asVoid(handleTest)}
                disabled={isTesting}
                variant="secondary"
                size="sm"
              >
                {isTesting
                  ? 'Testing…'
                  : isDefined(testResult)
                    ? 'Synchronize'
                    : 'Test & Synchronize'}
              </Button>
            )}
          </div>

          <div className="sm:min-h-10 sm:flex-1">
            {feedback && <InlineFeedback tone={feedback.tone} message={feedback.message} />}
          </div>
        </div>
      </form>
    </Card>
  );
}

export function TmdbSection() {
  const { refreshBootstrapStatus } = useAuth();
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [savedTokenSet, setSavedTokenSet] = useState(false);
  const [tokenInput, setTokenInput] = useState('');

  function clearFeedback() {
    setError('');
    setSuccess('');
  }

  function handleTokenChange(value: string) {
    clearFeedback();
    setTokenInput(value);
  }

  const isDirty = tokenInput !== '';
  const hasSavedSettings = savedTokenSet;
  const canTestConnection = hasSavedSettings && !isDirty;
  const feedback = error
    ? { tone: 'error' as const, message: error }
    : success
      ? { tone: 'success' as const, message: success }
      : null;

  const init = useCallback(async () => {
    setIsLoading(true);
    try {
      const settings = await adminTmdbService.getSettings();

      setSavedTokenSet(settings.tmdbAccessTokenSet);
      setTokenInput('');
      setTestResult(null);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void init();
  }, [init]);

  async function runTest() {
    setError('');
    setSuccess('');
    try {
      const result = await adminTmdbService.test();
      setTestResult(result);
      if (result) {
        setSuccess('Connection successful. TMDB is ready.');
        await refreshBootstrapStatus();
      } else {
        setError('Could not reach TMDB. Save a valid access token, then test again.');
      }
    } catch {
      setError('Failed to test connection');
    }
  }

  async function handleTest() {
    setIsTesting(true);
    try {
      await runTest();
    } finally {
      setIsTesting(false);
    }
  }

  async function saveSettings() {
    setError('');
    setSuccess('');
    try {
      const savedSettings = await adminTmdbService.saveSettings(
        tokenInput ? { tmdbAccessToken: tokenInput } : {},
      );

      setSavedTokenSet(savedSettings.tmdbAccessTokenSet);
      setTokenInput('');
      setTestResult(null);
    } catch {
      setError('Failed to save settings');
      throw new Error('save failed');
    }
  }

  async function handleSave(e: React.ChangeEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);
    try {
      await saveSettings();
    } finally {
      setIsSaving(false);
    }
  }

  const badgeBase = 'px-2 py-0.5 rounded text-xs font-medium';
  let statusBadge: React.ReactNode;
  if (isLoading) {
    statusBadge = <span className={`${badgeBase} bg-gray-700 text-gray-400`}>Loading…</span>;
  } else if (isDirty) {
    statusBadge = (
      <span className={`${badgeBase} border border-yellow-700 bg-yellow-900/50 text-yellow-400`}>
        Unsaved changes
      </span>
    );
  } else if (!hasSavedSettings) {
    statusBadge = <span className={`${badgeBase} bg-gray-700 text-gray-400`}>Not configured</span>;
  } else if (!isDefined(testResult)) {
    statusBadge = (
      <span className={`${badgeBase} border border-blue-700/70 bg-blue-900/40 text-blue-300`}>
        Ready to test
      </span>
    );
  } else if (testResult) {
    statusBadge = (
      <span className={`${badgeBase} border border-green-700 bg-green-900/50 text-green-400`}>
        Connected
      </span>
    );
  } else {
    statusBadge = (
      <span className={`${badgeBase} border border-red-700 bg-red-900/50 text-red-400`}>
        Disconnected
      </span>
    );
  }

  return (
    <Card variant="solid" padding="md">
      <div className="mb-5 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-white">TMDB</h3>
        {statusBadge}
      </div>
      <p className="-mt-3 mb-5 text-sm text-gray-400">
        Metadata provider for search, discovery, and media details.
      </p>

      <form onSubmit={asVoid(handleSave)} className="space-y-4">
        <StepPanel
          title="Step 1"
          message="Save the TMDB access token before testing the connection."
        >
          <div>
            <label className="mb-1.5 block text-sm text-gray-300">
              Access Token
              {savedTokenSet && !tokenInput && (
                <span className="ml-2 text-xs font-normal text-gray-500">
                  (already set — leave blank to keep)
                </span>
              )}
            </label>
            <Input
              type="password"
              value={tokenInput}
              onChange={(e) => {
                handleTokenChange(e.target.value);
              }}
              placeholder={savedTokenSet ? '••••••••••••••••' : 'Enter TMDB access token'}
              autoComplete="new-password"
            />
          </div>
        </StepPanel>

        <div className="flex flex-col gap-3 border-t border-gray-800/80 pt-4 sm:flex-row sm:items-start sm:gap-4">
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isSaving || !isDirty} size="sm">
              {isSaving ? 'Saving…' : 'Save Settings'}
            </Button>
            {canTestConnection && (
              <Button
                type="button"
                onClick={asVoid(handleTest)}
                disabled={isTesting}
                variant="secondary"
                size="sm"
              >
                {isTesting
                  ? 'Testing…'
                  : isDefined(testResult)
                    ? 'Synchronize'
                    : 'Test & Synchronize'}
              </Button>
            )}
          </div>

          <div className="sm:min-h-10 sm:flex-1">
            {feedback && <InlineFeedback tone={feedback.tone} message={feedback.message} />}
          </div>
        </div>
      </form>
    </Card>
  );
}

export function IntegrationsSettings() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        description="Configure TMDB, Jellyfin, Radarr, and Sonarr for discovery and automatic media management."
      />
      <div className="space-y-6">
        <TmdbSection />
        <JellyfinSection />
        <ArrSection
          service="radarr"
          title="Radarr"
          description="Movies — quality profile and root folder for new movie requests"
        />
        <ArrSection
          service="sonarr"
          title="Sonarr"
          description="TV Shows — quality profile and root folder for new series requests"
        />
      </div>
    </div>
  );
}
