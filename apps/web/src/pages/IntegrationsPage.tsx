import { ArrSection } from '../components/integrations/ArrSection';
import { LibSection } from '../components/integrations/LibSection';
import { TmdbSection } from '../components/integrations/TmdbSection';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';

export function IntegrationsPage() {
  return (
    <PageContainer>
      <div className="space-y-5">
        <PageHeader
          title="Integrations"
          description="Configure TMDB, Jellyfin, Plex, Radarr, and Sonarr for discovery and automatic media management."
        />
        <div className="space-y-4">
          <TmdbSection />
          <LibSection service="jellyfin" />
          <LibSection service="plex" />
          <ArrSection service="radarr" />
          <ArrSection service="sonarr" />
        </div>
      </div>
    </PageContainer>
  );
}
