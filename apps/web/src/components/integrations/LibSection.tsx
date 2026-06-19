import { isDefined } from '@findarr/shared/utils';
import { useState, type ChangeEvent } from 'react';

import { useConnectionState } from '../../hooks/useConnectionState';
import { createLibServiceApi } from '../../services/api';
import { asVoid } from '../../utils/asyncHandlers';
import { ConnectionActions } from './ConnectionActions';
import { ConnectionCredentialsStep } from './ConnectionCredentialsStep';
import { IntegrationCard } from './IntegrationCard';

const libServiceConfig = {
  jellyfin: {
    title: 'Jellyfin',
    urlPlaceholder: 'http://localhost:8096',
    apiKeyLabel: 'API Key' as const,
    apiKeyPlaceholder: 'Enter API key',
    successMessage: 'Connection successful. Jellyfin is ready.',
    errorMessage: 'Could not reach Jellyfin. Check the URL and API key, then test again.',
  },
  plex: {
    title: 'Plex',
    urlPlaceholder: 'http://localhost:32400',
    apiKeyLabel: 'Token' as const,
    apiKeyPlaceholder: 'Enter Plex token',
    successMessage: 'Connection successful. Plex is ready.',
    errorMessage: 'Could not reach Plex. Check the URL and token, then test again.',
  },
} as const;

interface LibSectionProps {
  service: keyof typeof libServiceConfig;
  forceDisabled?: boolean;
  onEnable?: () => void;
}

export function LibSection({ service, forceDisabled, onEnable }: LibSectionProps) {
  const svc = createLibServiceApi(service);
  const config = libServiceConfig[service];

  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [savedApiKeySet, setSavedApiKeySet] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [urlInput, setUrlInput] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');

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
    const settings = await svc.getSettings();
    setSavedUrl(settings.url);
    setSavedApiKeySet(settings.apiKeySet);
    setEnabled(settings.enabled);
    setUrlInput(settings.url ?? '');
    setTestResult(null);
  });

  const handleToggleEnabled = () => {
    const next = !enabled;
    setEnabled(next);
    void svc.saveSettings({ enabled: next });
    if (next) {
      onEnable?.();
    }
  };

  const isDirty = urlInput !== (savedUrl ?? '') || apiKeyInput !== '';
  const hasSavedSettings = isDefined(savedUrl) && savedApiKeySet;
  const canTestConnection = hasSavedSettings && !isDirty;

  const handleTest = async () =>
    wrapTest(async () => {
      const result = await svc.test();
      setTestResult(result);
      if (result) {
        setSuccess(config.successMessage);
      } else {
        setError(config.errorMessage);
      }
    });

  function handleSave(e: ChangeEvent<HTMLFormElement>) {
    e.preventDefault();
    const changedConnectionSettings = isDirty;
    void wrapSave(async () => {
      const savedSettings = await svc.saveSettings({
        ...(urlInput ? { url: urlInput } : {}),
        ...(apiKeyInput ? { apiKey: apiKeyInput } : {}),
      });
      setSavedUrl(savedSettings.url);
      setSavedApiKeySet(savedSettings.apiKeySet);
      setUrlInput(savedSettings.url ?? '');
      setApiKeyInput('');
      if (changedConnectionSettings) {
        setTestResult(null);
      }
    });
  }

  return (
    <IntegrationCard
      title={config.title}
      description="Media server — tracks availability of requested content"
      enabled={forceDisabled === true ? false : enabled}
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
      <ConnectionCredentialsStep
        urlValue={urlInput}
        onUrlChange={(v) => {
          clearFeedback();
          setUrlInput(v);
        }}
        urlPlaceholder={config.urlPlaceholder}
        apiKeyValue={apiKeyInput}
        onApiKeyChange={(v) => {
          clearFeedback();
          setApiKeyInput(v);
        }}
        apiKeySet={savedApiKeySet}
        apiKeyLabel={config.apiKeyLabel}
        apiKeyPlaceholder={config.apiKeyPlaceholder}
      />
    </IntegrationCard>
  );
}
