import { isDefined } from '@findarr/shared/utils';
import { useTranslation } from 'react-i18next';

import { FiltersToolbar } from '../components/catalog/FiltersToolbar';
import { SearchBar } from '../components/catalog/SearchBar';
import { MediaView } from '../components/media/MediaView';
import { PageContainer } from '../components/ui';
import { Button } from '../components/ui/Button';
import { ErrorState } from '../components/ui/ErrorState';
import { SearchFilterBar } from '../components/ui/SearchFilterBar';
import { LoadingState } from '../components/ui/StateDisplay';
import { VoteCompleteState } from '../components/vote/VoteCompleteState';
import { useMediaNavigation } from '../hooks/useMediaNavigation';
import { useVoteFeed } from '../hooks/useVoteFeed';
import { asVoid } from '../utils/asyncHandlers';

export function VotePage() {
  const { t } = useTranslation();
  const { goTo, goToSearch } = useMediaNavigation();
  const {
    currentMedia,
    isLoading,
    isComplete,
    error,
    selectedType,
    selectedGenres,
    fetchNextItem,
    onTypeChange,
    onGenresChange,
  } = useVoteFeed();

  return (
    <div className="pb-20 md:pb-8">
      <SearchFilterBar
        search={
          <SearchBar
            onSearch={(query) => {
              goToSearch(query);
            }}
            loading={false}
          />
        }
        filters={
          <FiltersToolbar
            selectedType={selectedType}
            onTypeChange={onTypeChange}
            disabled={isLoading}
            selectedGenres={selectedGenres}
            onGenresChange={onGenresChange}
          />
        }
      />

      {isLoading && (
        <PageContainer>
          <LoadingState />
        </PageContainer>
      )}

      {isDefined(error) && !isLoading && (
        <ErrorState
          message={error}
          action={
            <Button onClick={asVoid(async () => fetchNextItem())} className="mt-4">
              {t('vote.tryAgain')}
            </Button>
          }
        />
      )}

      {isComplete && !isLoading && (
        <VoteCompleteState
          onExplore={() => {
            goTo('/explore');
          }}
          onOpenSettings={() => {
            goTo('/settings');
          }}
        />
      )}

      {currentMedia && !isLoading && !isComplete && (
        <MediaView media={currentMedia} onVoteComplete={() => void fetchNextItem()} />
      )}
    </div>
  );
}
