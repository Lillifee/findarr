import type { Media } from '@findarr/shared/media';

import { ActivitySection } from '../components/activity/ActivitySection';
import { ActivityStatusFilter } from '../components/activity/ActivityStatusFilter';
import { AttentionQueueSection } from '../components/activity/AttentionQueueSection';
import { FiltersToolbar } from '../components/catalog/FiltersToolbar';
import { PageContainer } from '../components/ui/PageContainer';
import { useActivityFeed } from '../hooks/useActivityFeed';
import { useMediaNavigation } from '../hooks/useMediaNavigation';

export function ActivityPage() {
  const { goToMedia } = useMediaNavigation();
  const feed = useActivityFeed();

  const handleSelectItem = (item: Media) => {
    goToMedia(item, feed.persistHistoryState);
  };

  return (
    <>
      <FiltersToolbar
        selectedType={feed.selectedType}
        onTypeChange={(type) => {
          feed.reloadActivityWith({ type });
        }}
        selectedGenres={[]}
        onGenresChange={() => {}}
        showFiltersButton
        showGenreFilter={false}
        filterDescription="Adjust your activity filters."
        extraFiltersContent={
          <ActivityStatusFilter
            actionFilter={feed.actionFilter}
            onActionChange={(action) => {
              feed.reloadActivityWith({ action });
            }}
          />
        }
      />

      <PageContainer className="py-4 pb-20 md:py-8 md:pb-20">
        <AttentionQueueSection
          results={feed.attentionResults}
          loading={feed.loadingAttention}
          onSelectItem={handleSelectItem}
          onUpdateItem={feed.updateItem}
        />

        <ActivitySection
          results={feed.activityResults}
          loading={feed.loadingActivity}
          loadingMore={feed.loadingMore}
          hasMore={feed.hasMore}
          currentPage={feed.currentPage}
          totalPages={feed.totalPages}
          onSelectItem={handleSelectItem}
          onUpdateItem={feed.updateItem}
          onLoadMore={feed.loadMore}
        />
      </PageContainer>
    </>
  );
}
