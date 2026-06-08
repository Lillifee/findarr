import { isDefined } from '@findarr/shared/utils';
import { useState, useEffect, useCallback, type ChangeEvent } from 'react';

import { adminJellyfinService } from '../../services/api';
import { asVoid } from '../../utils/asyncHandlers';
import { deriveFeedback } from '../ui/feedback';
import { ConnectionActions } from './ConnectionActions';
import { ConnectionCredentialsStep } from './ConnectionCredentialsStep';
import { deriveConnectionStatus } from './connectionStatus';
import { IntegrationCard } from './IntegrationCard';

export function JellyfinSection() {
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
  const feedback = deriveFeedback(error, success);
  const status = deriveConnectionStatus({ isLoading, isDirty, hasSavedSettings, testResult });

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

  async function handleSave(e: ChangeEvent<HTMLFormElement>) {
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
