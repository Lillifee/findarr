import type { ArrSettings, ArrQualityProfile, ArrRootFolder } from '@findarr/shared/settings';
import { isDefined } from '@findarr/shared/utils';
import { useState, useCallback, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { useConnectionState } from '../../hooks/useConnectionState';
import { createArrServiceApi } from '../../services/api';
import { asVoid } from '../../utils/asyncHandlers';
import { SelectInput } from '../ui/SelectInput';
import { ConnectionActions } from './ConnectionActions';
import { ConnectionCredentialsStep } from './ConnectionCredentialsStep';
import { IntegrationCard } from './IntegrationCard';
import { StepPanel } from './StepPanel';

const readonlyClass =
  'w-full min-h-10 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3.5 py-2 text-sm text-zinc-500';

function formatBytes(bytes: number): string {
  const gb = bytes / 1024 ** 3;
  return `${gb.toFixed(1)} GB free`;
}

const defaultSettings: ArrSettings = {
  url: null,
  apiKeySet: false,
  qualityProfileId: null,
  rootFolderPath: null,
  enabled: true,
};

const arrServiceConfig = {
  radarr: {
    title: 'Radarr',
    description: 'Movies — quality profile and root folder for new movie requests',
    urlPlaceholder: 'http://localhost:7878',
  },
  sonarr: {
    title: 'Sonarr',
    description: 'TV Shows — quality profile and root folder for new series requests',
    urlPlaceholder: 'http://localhost:8989',
  },
} as const;

interface ArrSectionProps {
  service: keyof typeof arrServiceConfig;
}

export function ArrSection({ service }: ArrSectionProps) {
  const { t } = useTranslation();
  const svc = createArrServiceApi(service);
  const config = arrServiceConfig[service];

  const [settings, setSettings] = useState<ArrSettings>(defaultSettings);
  const [enabled, setEnabled] = useState(true);
  const [profiles, setProfiles] = useState<ArrQualityProfile[]>([]);
  const [rootFolders, setRootFolders] = useState<ArrRootFolder[]>([]);

  const [urlInput, setUrlInput] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [selectedRootFolder, setSelectedRootFolder] = useState('');

  const {
    isSaving,
    isTesting,
    testResult,
    setTestResult,
    setError,
    setSuccess,
    clearFeedback,
    feedback,
    wrapTest,
    wrapSave,
  } = useConnectionState(async () => {
    const currentSettings = await svc.getSettings();
    setSettings(currentSettings);
    setEnabled(currentSettings.enabled);
    setUrlInput(currentSettings.url ?? '');
    setSelectedProfileId(currentSettings.qualityProfileId?.toString() ?? '');
    setSelectedRootFolder(currentSettings.rootFolderPath ?? '');
    setTestResult(null);
    setProfiles([]);
    setRootFolders([]);
  });

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
  const handleToggleEnabled = () => {
    const next = !enabled;
    setEnabled(next);
    void svc.saveSettings({ enabled: next });
  };

  const connectionDirty = urlInput !== (settings.url ?? '') || apiKeyInput !== '';

  // Any setting changed (including profile/folder) - enables save button
  const isDirty =
    connectionDirty ||
    selectedProfileId !== (settings.qualityProfileId?.toString() ?? '') ||
    selectedRootFolder !== (settings.rootFolderPath ?? '');
  const hasSavedConnectionSettings = isDefined(settings.url) && settings.apiKeySet;
  const canTestConnection = hasSavedConnectionSettings && !connectionDirty;
  const connectionEstablished = canTestConnection && Boolean(testResult);

  const loadProfiles = useCallback(async () => {
    const [p, f] = await Promise.all([svc.listQualityProfiles(), svc.listRootFolders()]);
    setProfiles(p);
    setRootFolders(f);
  }, [svc]);

  const handleTest = async () =>
    wrapTest(async () => {
      const result = await svc.test();
      setTestResult(result);
      if (result) {
        await loadProfiles();
        setSuccess(t('integrationCard.arr.success'));
      } else {
        setProfiles([]);
        setRootFolders([]);
        setError(t('integrationCard.arr.error', { title: config.title }));
      }
    });

  function handleSave(e: ChangeEvent<HTMLFormElement>) {
    e.preventDefault();
    const changedConnectionSettings = connectionDirty;
    void wrapSave(async () => {
      const body: Record<string, unknown> = {};
      if (urlInput) {
        body['url'] = urlInput;
      }
      if (apiKeyInput) {
        body['apiKey'] = apiKeyInput;
      }
      if (selectedProfileId) {
        body['qualityProfileId'] = Math.trunc(Number(selectedProfileId));
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
    });
  }

  return (
    <IntegrationCard
      title={config.title}
      description={config.description}
      enabled={enabled}
      onToggleEnabled={handleToggleEnabled}
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
      <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
        <ConnectionCredentialsStep
          urlValue={urlInput}
          onUrlChange={handleUrlChange}
          urlPlaceholder={config.urlPlaceholder}
          apiKeyValue={apiKeyInput}
          onApiKeyChange={handleApiKeyChange}
          apiKeySet={settings.apiKeySet}
        />

        <StepPanel step={2} message={t('integrationCard.arr.step2Message')}>
          <div>
            <label className="mb-1.5 block text-sm text-zinc-300">
              {t('integrationCard.arr.qualityProfileLabel')}
            </label>
            {connectionEstablished && profiles.length > 0 ? (
              <SelectInput
                value={selectedProfileId}
                onChange={(e) => {
                  handleProfileChange(e.target.value);
                }}
              >
                <option value="">{t('integrationCard.arr.qualityProfilePlaceholder')}</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id.toString()}>
                    {p.name}
                  </option>
                ))}
              </SelectInput>
            ) : (
              <div className={`${readonlyClass} flex items-center`}>
                {t('integrationCard.arr.availableAfterTest')}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-zinc-300">
              {t('integrationCard.arr.rootFolderLabel')}
            </label>
            {connectionEstablished && rootFolders.length > 0 ? (
              <SelectInput
                value={selectedRootFolder}
                onChange={(e) => {
                  handleRootFolderChange(e.target.value);
                }}
              >
                <option value="">{t('integrationCard.arr.rootFolderPlaceholder')}</option>
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
