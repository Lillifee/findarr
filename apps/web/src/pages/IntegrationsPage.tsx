import { ArrSection } from '../components/integrations/ArrSection';
import { JellyfinSection } from '../components/integrations/JellyfinSection';
import { TmdbSection } from '../components/integrations/TmdbSection';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';

export function IntegrationsPage() {
  return (
    <PageContainer>
      <div className="space-y-5">
        <PageHeader
          title="Integrations"
          description="Configure TMDB, Jellyfin, Radarr, and Sonarr for discovery and automatic media management."
        />
        <div className="space-y-4">
          <TmdbSection />
          <JellyfinSection />
          <ArrSection
            service="radarr"
            title="Radarr"
            description="Movies — quality profile and root folder for new movie requests"
          />
          <ArrSection
            service="sonarr"
            title="Sonarr"
            description="TV Shows — quality profile and root folder for new series requests"
          />
        </div>
      </div>
    </PageContainer>
  );
}
