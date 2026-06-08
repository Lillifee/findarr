import type { ArrSettings, ArrQualityProfile, ArrRootFolder } from '@findarr/shared/settings';
import { isDefined } from '@findarr/shared/utils';
import { useState, useEffect, useCallback, type ChangeEvent } from 'react';

import { adminArrService } from '../../services/api';
import { asVoid } from '../../utils/asyncHandlers';
import { deriveFeedback } from '../ui/feedback';
import { SelectInput } from '../ui/SelectInput';
import { ConnectionActions } from './ConnectionActions';
import { ConnectionCredentialsStep } from './ConnectionCredentialsStep';
import { deriveConnectionStatus } from './connectionStatus';
import { IntegrationCard } from './IntegrationCard';
import { StepPanel } from './StepPanel';

const readonlyClass =
  'w-full min-h-10 rounded-lg border border-gray-700/50 bg-gray-800/60 px-3.5 py-2 text-sm text-gray-500';

function formatBytes(bytes: number): string {
  const gb = bytes / 1024 ** 3;
  return `${gb.toFixed(1)} GB free`;
}

const defaultSettings: ArrSettings = {
  url: null,
  apiKeySet: false,
  qualityProfileId: null,
  rootFolderPath: null,
};

interface ArrSectionProps {
  service: 'radarr' | 'sonarr';
  title: string;
  description: string;
}

export function ArrSection({ service, title, description }: ArrSectionProps) {
  const svc = adminArrService[service];

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
  const connectionDirty = urlInput !== (settings.url ?? '') || apiKeyInput !== '';

  // Any setting changed (including profile/folder) - enables save button
  const isDirty =
    connectionDirty ||
    selectedProfileId !== (settings.qualityProfileId?.toString() ?? '') ||
    selectedRootFolder !== (settings.rootFolderPath ?? '');
  const hasSavedConnectionSettings = isDefined(settings.url) && settings.apiKeySet;
  const canTestConnection = hasSavedConnectionSettings && !connectionDirty;
  const connectionEstablished = canTestConnection && Boolean(testResult);
  const feedback = deriveFeedback(error, success);
  const status = deriveConnectionStatus({
    isLoading,
    isDirty: connectionDirty,
    hasSavedSettings: hasSavedConnectionSettings,
    testResult,
  });

  const loadProfiles = useCallback(async () => {
    const [p, f] = await Promise.all([svc.listQualityProfiles(), svc.listRootFolders()]);
    setProfiles(p);
    setRootFolders(f);
  }, [svc]);

  const init = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentSettings = await svc.getSettings();

      setSettings(currentSettings);
      setUrlInput(currentSettings.url ?? '');
      setSelectedProfileId(currentSettings.qualityProfileId?.toString() ?? '');
      setSelectedRootFolder(currentSettings.rootFolderPath ?? '');
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

  async function handleSave(e: ChangeEvent<HTMLFormElement>) {
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

      setSettings(savedSettings);
      setUrlInput(savedSettings.url ?? '');
      setSelectedProfileId(savedSettings.qualityProfileId?.toString() ?? '');
      setSelectedRootFolder(savedSettings.rootFolderPath ?? '');
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

  return (
    <IntegrationCard
      title={title}
      description={description}
      status={status}
      onSubmit={asVoid(handleSave)}
      actions={
        <ConnectionActions
          isSaving={isSaving}
          isDirty={isDirty}
          canTest={canTestConnection}
          isTesting={isTesting}
          hasTestResult={isDefined(testResult)}
          feedback={feedback}
          onTest={asVoid(handleTest)}
        />
      }
    >
      <div className="grid gap-5 xl:grid-cols-2 xl:items-start">
        <ConnectionCredentialsStep
          urlValue={urlInput}
          onUrlChange={handleUrlChange}
          urlPlaceholder="http://localhost:7878"
          apiKeyValue={apiKeyInput}
          onApiKeyChange={handleApiKeyChange}
          apiKeySet={settings.apiKeySet}
        />

        <StepPanel
          title="Step 2"
          message="Choose the quality profile and root folder for new requests."
        >
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
    </IntegrationCard>
  );
}
