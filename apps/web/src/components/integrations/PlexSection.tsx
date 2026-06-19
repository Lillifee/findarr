import { isDefined } from '@findarr/shared/utils';
import { useState, type ChangeEvent } from 'react';

import { useConnectionState } from '../../hooks/useConnectionState';
import { adminPlexService } from '../../services/api';
import { asVoid } from '../../utils/asyncHandlers';
import { ConnectionActions } from './ConnectionActions';
import { ConnectionCredentialsStep } from './ConnectionCredentialsStep';
import { deriveConnectionStatus } from './connectionStatus';
import { IntegrationCard } from './IntegrationCard';

export function PlexSection() {
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [savedTokenSet, setSavedTokenSet] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');

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
    const settings = await adminPlexService.getSettings();
    setSavedUrl(settings.url);
    setSavedTokenSet(settings.apiKeySet);
    setUrlInput(settings.url ?? '');
    setTestResult(null);
  });

  const isDirty = urlInput !== (savedUrl ?? '') || tokenInput !== '';
  const hasSavedSettings = isDefined(savedUrl) && savedTokenSet;
  const canTestConnection = hasSavedSettings && !isDirty;
  const status = deriveConnectionStatus({ isLoading, isDirty, hasSavedSettings, testResult });

  function handleUrlChange(value: string) {
    clearFeedback();
    setUrlInput(value);
  }
  function handleTokenChange(value: string) {
    clearFeedback();
    setTokenInput(value);
  }

  const handleTest = async () =>
    wrapTest(async () => {
      const result = await adminPlexService.test();
      setTestResult(result);
      if (result) {
        setSuccess('Connection successful. Plex is ready.');
      } else {
        setError('Could not reach Plex. Check the URL and token, then test again.');
      }
    });

  function handleSave(e: ChangeEvent<HTMLFormElement>) {
    e.preventDefault();
    const changedConnectionSettings = isDirty;
    void wrapSave(async () => {
      const savedSettings = await adminPlexService.saveSettings({
        ...(urlInput ? { url: urlInput } : {}),
        ...(tokenInput ? { apiKey: tokenInput } : {}),
      });
      setSavedUrl(savedSettings.url);
      setSavedTokenSet(savedSettings.apiKeySet);
      setUrlInput(savedSettings.url ?? '');
      setTokenInput('');
      if (changedConnectionSettings) {
        setTestResult(null);
      }
    });
  }

  return (
    <IntegrationCard
      title="Plex"
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
        urlPlaceholder="http://localhost:32400"
        apiKeyValue={tokenInput}
        onApiKeyChange={handleTokenChange}
        apiKeySet={savedTokenSet}
        apiKeyLabel="Token"
        apiKeyPlaceholder="Enter Plex token"
      />
    </IntegrationCard>
  );
}
