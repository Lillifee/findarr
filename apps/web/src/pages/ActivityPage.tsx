import type { Media } from '@findarr/shared/media';
import { useTranslation } from 'react-i18next';

import { ActivitySection } from '../components/activity/ActivitySection';
import { ActivityStatusFilter } from '../components/activity/ActivityStatusFilter';
import { AttentionQueueSection } from '../components/activity/AttentionQueueSection';
import { FiltersToolbar } from '../components/catalog/FiltersToolbar';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { StickyHeader } from '../components/ui/StickyHeader';
import { useActivityFeed } from '../hooks/useActivityFeed';
import { useMediaNavigation } from '../hooks/useMediaNavigation';

export function ActivityPage() {
  const { t } = useTranslation();
  const { goToMedia } = useMediaNavigation();
  const feed = useActivityFeed();

  const handleSelectItem = (item: Media) => {
    goToMedia(item, feed.persistHistoryState);
  };

  return (
    <>
      <StickyHeader>
        <FiltersToolbar
          selectedType={feed.selectedType}
          onTypeChange={(type) => {
            feed.reloadActivityWith({ type });
          }}
          filterDescription={t('activity.adjustFilters')}
          extraFiltersContent={
            <ActivityStatusFilter
              actionFilter={feed.actionFilter}
              onActionChange={(action) => {
                feed.reloadActivityWith({ action });
              }}
            />
          }
        />
      </StickyHeader>

      <PageContainer>
        <div className="space-y-8 md:space-y-10">
          <PageHeader title={t('activity.title')} description={t('activity.description')} />

          <AttentionQueueSection
            results={feed.attentionResults}
            onSelectItem={handleSelectItem}
            onUpdateItem={feed.updateItem}
          />

          <ActivitySection
            results={feed.activityResults}
            loading={feed.loadingActivity}
            loadingMore={feed.loadingMore}
            hasMore={feed.hasMore}
            onSelectItem={handleSelectItem}
            onUpdateItem={feed.updateItem}
            onLoadMore={feed.loadMore}
          />
        </div>
      </PageContainer>
    </>
  );
}
