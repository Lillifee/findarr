import type { Media } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';

import { SearchBar } from '../components/catalog/SearchBar';
import { DashboardHero } from '../components/dashboard/DashboardHero';
import { NewlyAvailableSection } from '../components/dashboard/NewlyAvailableSection';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { StickyHeader } from '../components/ui/StickyHeader';
import { useDashboardData } from '../hooks/useDashboardData';
import { useMediaNavigation } from '../hooks/useMediaNavigation';
import { useSession } from '../hooks/useSession';

export function DashboardPage() {
  const { goTo, goToMedia, goToSearch } = useMediaNavigation();
  const { user } = useSession();
  const dashboard = useDashboardData();

  const handleSelectItem = (item: Media) => {
    goToMedia(item);
  };

  return (
    <>
      <StickyHeader>
        <SearchBar onSearch={goToSearch} loading={false} />
      </StickyHeader>

      <PageContainer>
        <div className="space-y-8 md:space-y-10">
          <PageHeader
            title={`Welcome back${isDefined(user?.displayName) ? `, ${user.displayName}` : ''}`}
            description="Check out what's popular, vote on requests, and discover what's rising."
          />

          <DashboardHero
            nextMedia={dashboard.nextMedia}
            heroError={dashboard.heroError}
            loading={dashboard.loadingHero}
            onNavigate={goTo}
          />

          <NewlyAvailableSection
            results={dashboard.availableResults}
            hasMore={dashboard.availableHasMore}
            loading={dashboard.loadingAvailable}
            error={dashboard.availableError}
            onSelectItem={handleSelectItem}
          />
        </div>
      </PageContainer>
    </>
  );
}
