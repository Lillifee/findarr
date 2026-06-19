import { useState } from 'react';

import { ArrSection } from '../components/integrations/ArrSection';
import { LibSection } from '../components/integrations/LibSection';
import { TmdbSection } from '../components/integrations/TmdbSection';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { createLibServiceApi } from '../services/api';

export function IntegrationsPage() {
  const [activeLib, setActiveLib] = useState<'jellyfin' | 'plex' | null>(null);

  const handleLibEnable = (enabled: 'jellyfin' | 'plex') => {
    const other = enabled === 'jellyfin' ? 'plex' : 'jellyfin';
    setActiveLib(enabled);
    void createLibServiceApi(other).saveSettings({ enabled: false });
  };

  return (
    <PageContainer>
      <div className="space-y-5">
        <PageHeader
          title="Integrations"
          description="Configure TMDB, Jellyfin, Plex, Radarr, and Sonarr for discovery and automatic media management."
        />
        <div className="space-y-4">
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
