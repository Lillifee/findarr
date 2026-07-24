import type { Media } from '@findarr/shared/media';
import { useTranslation } from 'react-i18next';

import { ActivitySection } from '../components/activity/ActivitySection';
import { ActivityStatusFilter } from '../components/activity/ActivityStatusFilter';
import { FiltersToolbar } from '../components/catalog/FiltersToolbar';
import { QuickActionBar, type QuickActionItem } from '../components/ui';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { StickyHeader } from '../components/ui/StickyHeader';
import { useActivityFeed } from '../hooks/useActivityFeed';
import { useMediaNavigation } from '../hooks/useMediaNavigation';

export function ActivityPage() {
  const { t } = useTranslation();
  const { goToMedia } = useMediaNavigation();
  const feed = useActivityFeed();

  const quickActions: QuickActionItem[] = [
    {
      id: 'mine',
      label: t('activity.audience.mine'),
      icon: 'person',
      selected: feed.audience === 'mine' && feed.statusGroups.length === 0,
      onClick: () => {
        feed.reloadActivityWith({ audience: 'mine', statusGroups: [] });
      },
    },
    {
      id: 'voting',
      label: t('activity.quickNav.voting'),
      icon: 'how_to_vote',
      selected:
        feed.audience === 'everyone' &&
        feed.statusGroups.length === 1 &&
        feed.statusGroups[0] === 'voting',
      onClick: () => {
        feed.reloadActivityWith({ audience: 'everyone', statusGroups: ['voting'] });
      },
    },
    {
      id: 'newly-available',
      label: t('activity.quickNav.newlyAvailable'),
      icon: 'download',
      selected:
        feed.audience === 'mine' &&
        feed.statusGroups.length === 1 &&
        feed.statusGroups[0] === 'available',
      onClick: () => {
        feed.reloadActivityWith({ audience: 'mine', statusGroups: ['available'] });
      },
    },
    {
      id: 'needs-attention',
      label: t('activity.quickNav.needsAttention'),
      icon: 'warning',
      selected:
        feed.audience === 'everyone' &&
        feed.statusGroups.includes('downloading') &&
        feed.statusGroups.includes('warning') &&
        feed.statusGroups.length === 2,
      onClick: () => {
        feed.reloadActivityWith({ audience: 'everyone', statusGroups: ['downloading', 'warning'] });
      },
    },
  ];

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
          extraFiltersContent={
            <ActivityStatusFilter
              audience={feed.audience}
              statusGroups={feed.statusGroups}
              onAudienceChange={(audience) => {
                feed.reloadActivityWith({ audience });
              }}
              onStatusGroupsChange={(statusGroups) => {
                feed.reloadActivityWith({ statusGroups });
              }}
            />
          }
        />
      </StickyHeader>

      <PageContainer>
        <div className="space-y-6 md:space-y-8">
          <PageHeader title={t('activity.title')} description={t('activity.description')} />

          <QuickActionBar items={quickActions} />

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
