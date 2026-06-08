import { isDefined } from '@findarr/shared/utils';
import { useState, useEffect, useCallback, type ChangeEvent } from 'react';

import { useAuth } from '../../hooks/useAuth';
import { adminTmdbService } from '../../services/api';
import { asVoid } from '../../utils/asyncHandlers';
import { deriveFeedback } from '../ui/feedback';
import { ConnectionActions } from './ConnectionActions';
import { deriveConnectionStatus } from './connectionStatus';
import { IntegrationCard } from './IntegrationCard';
import { SecretField } from './SecretField';
import { StepPanel } from './StepPanel';

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
  const feedback = deriveFeedback(error, success);
  const status = deriveConnectionStatus({ isLoading, isDirty, hasSavedSettings, testResult });

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

  async function handleSave(e: ChangeEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);
    try {
      await saveSettings();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <IntegrationCard
      title="TMDB"
      description="Metadata provider for search, discovery, and media details."
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
      <StepPanel title="Step 1" message="Save the TMDB access token before testing the connection.">
        <SecretField
          label="Access Token"
          value={tokenInput}
          onChange={handleTokenChange}
          isSet={savedTokenSet}
          placeholder="Enter TMDB access token"
        />
      </StepPanel>
    </IntegrationCard>
  );
}
