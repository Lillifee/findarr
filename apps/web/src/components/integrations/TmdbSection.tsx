import { isDefined } from '@findarr/shared/utils';
import { useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { useConnectionState } from '../../hooks/useConnectionState';
import { useSession } from '../../hooks/useSession';
import { adminTmdbService } from '../../services/api';
import { asVoid } from '../../utils/asyncHandlers';
import { ConnectionActions } from './ConnectionActions';
import { IntegrationCard } from './IntegrationCard';
import { SecretField } from './SecretField';
import { StepPanel } from './StepPanel';

export function TmdbSection() {
  const { t } = useTranslation();
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
        setSuccess(t('integrationCard.connectionTest.success'));
        await refreshBootstrapStatus();
      } else {
        setError(t('integrationCard.connectionTest.error'));
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
      description={t('integrationCard.tmdb.description')}
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
      <StepPanel step={1} message={t('integrationCard.tmdb.stepMessage')}>
        <SecretField
          label={t('integrationCard.tmdb.accessTokenLabel')}
          value={tokenInput}
          onChange={handleTokenChange}
          isSet={savedTokenSet}
          placeholder={t('integrationCard.tmdb.accessTokenPlaceholder')}
        />
      </StepPanel>
    </IntegrationCard>
  );
}
