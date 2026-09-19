import { isDefined } from '@findarr/shared/utils';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { FiltersToolbar } from '../components/catalog/FiltersToolbar';
import { MediaView } from '../components/media/MediaView';
import { ResultsGrid } from '../components/media/ResultsGrid';
import { PageContainer } from '../components/ui';
import { Button } from '../components/ui/Button';
import { ErrorState } from '../components/ui/ErrorState';
import { PageHeader } from '../components/ui/PageHeader';
import { SearchFilterBar } from '../components/ui/SearchFilterBar';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { LoadingState } from '../components/ui/StateDisplay';
import { VoteCompleteState } from '../components/vote/VoteCompleteState';
import { useMediaNavigation } from '../hooks/useMediaNavigation';
import { useVoteFeed } from '../hooks/useVoteFeed';
import { asVoid } from '../utils/asyncHandlers';

export function VotePage() {
  const { t } = useTranslation();
  const { goToMedia } = useMediaNavigation();
  const [searchParams, setSearchParams] = useSearchParams();
  const viewMode = searchParams.get('view') === 'grid' ? 'grid' : 'single';

  const setViewMode = (mode: 'single' | 'grid') => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('view', mode);
      return next;
    });
  };

  const {
    currentMedia,
    isLoading,
    isComplete,
    error,
    selectedType,
    fetchNextItem,
    onTypeChange,
    results,
    nextResults,
    queueIsLoading,
    queueError,
    queueHasMore,
    updateItem,
    retryQueue,
    loadMore,
  } = useVoteFeed();

  const handleItemUpdate = (item: Parameters<typeof updateItem>[0]) => {
    updateItem(item);
  };

  return (
    <div className="pb-20 md:pb-8">
      <SearchFilterBar
        filters={
          <FiltersToolbar
            selectedType={selectedType}
            onTypeChange={onTypeChange}
            disabled={isLoading || queueIsLoading}
          />
        }
        actions={
          <SegmentedControl
            ariaLabel={t('vote.viewMode.label')}
            options={[
              { value: 'single', label: t('vote.viewMode.single'), icon: 'view_list' },
              { value: 'grid', label: t('vote.viewMode.grid'), icon: 'grid_view' },
            ]}
            selectedValue={viewMode}
            onChange={setViewMode}
          />
        }
      />

      {viewMode === 'single' && isLoading && (
        <PageContainer>
          <LoadingState className="flex min-h-[50vh] items-center justify-center" />
        </PageContainer>
      )}

      {viewMode === 'single' && isDefined(error) && !isLoading && (
        <ErrorState
          message={error}
          action={
            <Button onClick={asVoid(async () => fetchNextItem())} className="mt-4">
              {t('vote.tryAgain')}
            </Button>
          }
        />
      )}

      {viewMode === 'single' && isComplete && !isLoading && (
        <VoteCompleteState
          onPrimaryAction={() => {
            setViewMode('grid');
          }}
        />
      )}

      {viewMode === 'single' && currentMedia && !isLoading && !isComplete && (
        <MediaView media={currentMedia} onMediaUpdate={handleItemUpdate} />
      )}

      {viewMode === 'grid' && (
        <PageContainer>
          <div className="space-y-8 md:space-y-10">
            {queueIsLoading && results.length === 0 && (
              <LoadingState className="flex min-h-[50vh] items-center justify-center" />
            )}
            {isDefined(queueError) && !queueIsLoading && (
              <ErrorState
                message={queueError}
                action={<Button onClick={asVoid(retryQueue)}>{t('vote.tryAgain')}</Button>}
              />
            )}
            {!isDefined(queueError) && results.length > 0 && (
              <section className="space-y-6 md:space-y-8">
                <PageHeader
                  title={t('vote.grid.votingRangeTitle')}
                  description={t('vote.grid.votingRangeDescription')}
                />
                <ResultsGrid
                  results={results}
                  onSelectItem={goToMedia}
                  onUpdateItem={handleItemUpdate}
                />
              </section>
            )}
            {nextResults.length > 0 && (
              <section className="space-y-6 md:space-y-8">
                <PageHeader
                  title={t('vote.grid.nextTitle')}
                  description={t('vote.grid.nextDescription')}
                />
                <ResultsGrid
                  results={nextResults}
                  onSelectItem={goToMedia}
                  onUpdateItem={handleItemUpdate}
                />
              </section>
            )}
            {queueHasMore && (
              <div className="mt-6 border-t border-zinc-800 pt-4 text-center md:mt-8 md:pt-6 md:pb-0">
                <Button variant="secondary" loading={queueIsLoading} onClick={asVoid(loadMore)}>
                  {t('common.loadMore')}
                </Button>
              </div>
            )}
          </div>
        </PageContainer>
      )}
    </div>
  );
}
