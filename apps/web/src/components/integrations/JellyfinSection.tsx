import { isDefined } from '@findarr/shared/utils';
import { useState, type ChangeEvent } from 'react';

import { useConnectionState } from '../../hooks/useConnectionState';
import { adminJellyfinService } from '../../services/api';
import { asVoid } from '../../utils/asyncHandlers';
import { ConnectionActions } from './ConnectionActions';
import { ConnectionCredentialsStep } from './ConnectionCredentialsStep';
import { deriveConnectionStatus } from './connectionStatus';
import { IntegrationCard } from './IntegrationCard';

export function JellyfinSection() {
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [savedApiKeySet, setSavedApiKeySet] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');

  const {
    isLoading,
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
    const settings = await adminJellyfinService.getSettings();
    setSavedUrl(settings.url);
    setSavedApiKeySet(settings.apiKeySet);
    setUrlInput(settings.url ?? '');
    setTestResult(null);
  });

  const isDirty = urlInput !== (savedUrl ?? '') || apiKeyInput !== '';
  const hasSavedSettings = isDefined(savedUrl) && savedApiKeySet;
  const canTestConnection = hasSavedSettings && !isDirty;
  const status = deriveConnectionStatus({ isLoading, isDirty, hasSavedSettings, testResult });

  function handleUrlChange(value: string) {
    clearFeedback();
    setUrlInput(value);
  }
  function handleApiKeyChange(value: string) {
    clearFeedback();
    setApiKeyInput(value);
  }

  const handleTest = async () =>
    wrapTest(async () => {
      const result = await adminJellyfinService.test();
      setTestResult(result);
      if (result) {
        setSuccess('Connection successful. Jellyfin is ready.');
      } else {
        setError('Could not reach Jellyfin. Check the URL and API key, then test again.');
      }
    });

  function handleSave(e: ChangeEvent<HTMLFormElement>) {
    e.preventDefault();
    const changedConnectionSettings = isDirty;
    void wrapSave(async () => {
      const savedSettings = await adminJellyfinService.saveSettings({
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
      title="Jellyfin"
      description="Media server — tracks availability of requested content"
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
      <ConnectionCredentialsStep
        urlValue={urlInput}
        onUrlChange={handleUrlChange}
        urlPlaceholder="http://localhost:8096"
        apiKeyValue={apiKeyInput}
        onApiKeyChange={handleApiKeyChange}
        apiKeySet={savedApiKeySet}
      />
    </IntegrationCard>
  );
}
