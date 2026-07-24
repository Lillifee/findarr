import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useConnectionState } from '../../hooks/useConnectionState';
import { adminAdministrationSettingsService } from '../../services/api';
import { asVoid } from '../../utils/asyncHandlers';
import { RangeSetting } from '../settings/RangeSetting';
import { ConnectionActions } from './ConnectionActions';
import { IntegrationCard } from './IntegrationCard';

export function CommunityVoteThresholdSection() {
  const { t } = useTranslation();
  const [voteThreshold, setVoteThreshold] = useState(1);
  const [savedVoteThreshold, setSavedVoteThreshold] = useState(1);

  const { isSaving, clearFeedback, feedback, wrapSave } = useConnectionState(async () => {
    const settings = await adminAdministrationSettingsService.get();
    setVoteThreshold(settings.voteThreshold);
    setSavedVoteThreshold(settings.voteThreshold);
  });

  const handleThresholdSubmit = () => {
    void wrapSave(async () => {
      const saved = await adminAdministrationSettingsService.update({ voteThreshold });
      setVoteThreshold(saved.voteThreshold);
      setSavedVoteThreshold(saved.voteThreshold);
    });
  };

  return (
    <IntegrationCard
      title={t('admin.globalSettingsTitle')}
      description={t('admin.globalSettingsDescription')}
      onSubmit={asVoid((event) => {
        event.preventDefault();
        clearFeedback();
        handleThresholdSubmit();
      })}
      actions={
        <ConnectionActions
          isSaving={isSaving}
          isDirty={voteThreshold !== savedVoteThreshold}
          canTest={false}
          isTesting={false}
          hasTestResult={false}
          feedback={feedback}
          onTest={asVoid(() => {})}
        />
      }
    >
      <RangeSetting
        id="voteThreshold"
        label={t('admin.voteThreshold')}
        value={voteThreshold}
        min={1}
        max={10}
        step={1}
        onChange={(value) => {
          clearFeedback();
          setVoteThreshold(value);
        }}
        description={t('admin.voteThresholdDescription')}
        suffix={` ${t('admin.votes')}`}
      />
    </IntegrationCard>
  );
}
