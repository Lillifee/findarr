import type { Media } from '@findarr/shared/media';
import { useTranslation } from 'react-i18next';

import { DashboardHero } from '../components/dashboard/DashboardHero';
import { NewlyAvailableSection } from '../components/dashboard/NewlyAvailableSection';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { useDashboardData } from '../hooks/useDashboardData';
import { useMediaNavigation } from '../hooks/useMediaNavigation';
import { useSession } from '../hooks/useSession';

export function DashboardPage() {
  const { t } = useTranslation();
  const { goTo, goToMedia } = useMediaNavigation();
  const { user } = useSession();
  const dashboard = useDashboardData();

  const handleSelectItem = (item: Media) => {
    goToMedia(item);
  };

  return (
    <PageContainer>
      <div className="space-y-8 md:space-y-10">
        <PageHeader
          title={t('dashboard.welcomeBack', { name: user?.displayName })}
          description={t('dashboard.description')}
        />

        <DashboardHero
          nextMedia={dashboard.nextMedia}
          heroError={dashboard.heroError}
          loading={dashboard.loadingHero}
          onNavigate={goTo}
        />

        <NewlyAvailableSection
          results={dashboard.availableResults}
          loading={dashboard.loadingAvailable}
          onSelectItem={handleSelectItem}
        />
      </div>
    </PageContainer>
  );
}
