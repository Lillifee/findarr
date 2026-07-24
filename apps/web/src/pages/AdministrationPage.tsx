import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ArrSection } from '../components/administration/ArrSection';
import { CommunityVoteThresholdSection } from '../components/administration/CommunityVoteThresholdSection';
import { LibSection } from '../components/administration/LibSection';
import { TmdbSection } from '../components/administration/TmdbSection';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { createLibServiceApi } from '../services/api';

export function AdministrationPage() {
  const { t } = useTranslation();
  const [activeLib, setActiveLib] = useState<'jellyfin' | 'plex' | null>(null);

  const handleLibEnable = (enabled: 'jellyfin' | 'plex') => {
    const other = enabled === 'jellyfin' ? 'plex' : 'jellyfin';
    setActiveLib(enabled);
    void createLibServiceApi(other).saveSettings({ enabled: false });
  };

  return (
    <PageContainer>
      <div className="space-y-5">
        <PageHeader title={t('admin.title')} description={t('admin.description')} />
        <div className="space-y-4">
          <CommunityVoteThresholdSection />
          <TmdbSection />
          <LibSection
            service="jellyfin"
            onEnable={() => {
              handleLibEnable('jellyfin');
            }}
            forceDisabled={activeLib === 'plex'}
          />
          <LibSection
            service="plex"
            onEnable={() => {
              handleLibEnable('plex');
            }}
            forceDisabled={activeLib === 'jellyfin'}
          />
          <ArrSection service="radarr" />
          <ArrSection service="sonarr" />
        </div>
      </div>
    </PageContainer>
  );
}
