import type { Media } from '@findarr/shared/media';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { ActivitySection } from '../components/activity/ActivitySection';
import { ActivityStatusFilter } from '../components/activity/ActivityStatusFilter';
import { FiltersToolbar } from '../components/catalog/FiltersToolbar';
import { QuickActionBar, type QuickActionItem } from '../components/ui';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { StickyHeader } from '../components/ui/StickyHeader';
import { useMediaUpdates } from '../contexts/MediaUpdateContext';
import { useActivityFeed } from '../hooks/useActivityFeed';
import { useMediaNavigation } from '../hooks/useMediaNavigation';

export function ActivityPage() {
  const { t } = useTranslation();
  const { goToMedia } = useMediaNavigation();
  const mediaUpdates = useMediaUpdates();
  const feed = useActivityFeed();

  useEffect(() => mediaUpdates?.subscribe(feed.updateItem), [feed.updateItem, mediaUpdates]);

  const quickActions: QuickActionItem[] = [
    {
      id: 'mine',
      label: t('activity.audience.mine'),
      icon: 'person',
      selected: feed.audience === 'mine' && feed.statuses.length === 0,
      onClick: () => {
        feed.reloadActivityWith({ audience: 'mine', statuses: [], action: 'all' });
      },
    },
    {
      id: 'newly-available',
      label: t('activity.quickNav.newlyAvailable'),
      icon: 'download',
      selected:
        feed.audience === 'mine' && feed.statuses.length === 1 && feed.statuses[0] === 'available',
      onClick: () => {
        feed.reloadActivityWith({ audience: 'mine', statuses: ['available'], action: 'liked' });
      },
    },
    {
      id: 'needs-attention',
      label: t('activity.quickNav.needsAttention'),
      icon: 'warning',
      selected:
        feed.audience === 'everyone' &&
        feed.statuses.includes('downloading') &&
        feed.statuses.includes('warning') &&
        feed.statuses.length === 2,
      onClick: () => {
        feed.reloadActivityWith({
          audience: 'everyone',
          statuses: ['downloading', 'warning'],
          action: 'all',
        });
      },
    },
    {
      id: 'voting',
      label: t('activity.quickNav.voting'),
      icon: 'how_to_vote',
      selected:
        feed.audience === 'everyone' && feed.statuses.length === 1 && feed.statuses[0] === 'voting',
      onClick: () => {
        feed.reloadActivityWith({ audience: 'everyone', statuses: ['voting'], action: 'all' });
      },
    },
  ];

  const handleSelectItem = (item: Media) => {
    goToMedia(item);
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
              statuses={feed.statuses}
              action={feed.action}
              onAudienceChange={(audience) => {
                feed.reloadActivityWith({ audience });
              }}
              onStatusChange={(statusGroups) => {
                feed.reloadActivityWith({ statuses: statusGroups });
              }}
              onActionChange={(action) => {
                feed.reloadActivityWith({ action });
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
