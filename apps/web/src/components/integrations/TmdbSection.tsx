import { isDefined } from '@findarr/shared/utils';
import { useState, type ChangeEvent } from 'react';

import { useConnectionState } from '../../hooks/useConnectionState';
import { useSession } from '../../hooks/useSession';
import { adminTmdbService } from '../../services/api';
import { asVoid } from '../../utils/asyncHandlers';
import { ConnectionActions } from './ConnectionActions';
import { IntegrationCard } from './IntegrationCard';
import { SecretField } from './SecretField';
import { StepPanel } from './StepPanel';

export function TmdbSection() {
  const { refreshBootstrapStatus } = useSession();
  const [savedTokenSet, setSavedTokenSet] = useState(false);
  const [tokenInput, setTokenInput] = useState('');

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
    const settings = await adminTmdbService.getSettings();
    setSavedTokenSet(settings.tmdbAccessTokenSet);
    setTokenInput('');
    setTestResult(null);
  });

  const isDirty = tokenInput !== '';
  const hasSavedSettings = savedTokenSet;
  const canTestConnection = hasSavedSettings && !isDirty;

  function handleTokenChange(value: string) {
    clearFeedback();
    setTokenInput(value);
  }

  const handleTest = async () =>
    wrapTest(async () => {
      const result = await adminTmdbService.test();
      setTestResult(result);
      if (result) {
        setSuccess('Connection successful. TMDB is ready.');
        await refreshBootstrapStatus();
      } else {
        setError('Could not reach TMDB. Save a valid access token, then test again.');
      }
    });

  function handleSave(e: ChangeEvent<HTMLFormElement>) {
    e.preventDefault();
    void wrapSave(async () => {
      const savedSettings = await adminTmdbService.saveSettings(
        tokenInput ? { tmdbAccessToken: tokenInput } : {},
      );
      setSavedTokenSet(savedSettings.tmdbAccessTokenSet);
      setTokenInput('');
      setTestResult(null);
    });
  }

  return (
    <IntegrationCard
      title="TMDB"
      description="Metadata provider for search, discovery, and media details."
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
