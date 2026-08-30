import type { Media } from '@findarr/shared/media';
import { useTranslation } from 'react-i18next';

import { FiltersToolbar } from '../components/catalog/FiltersToolbar';
import { PersonSearchResults } from '../components/catalog/PersonSearchResults';
import { SearchBar } from '../components/catalog/SearchBar';
import { PaginatedMediaResults } from '../components/media/PaginatedMediaResults';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { SearchFilterBar } from '../components/ui/SearchFilterBar';
import { useCatalogFeed } from '../hooks/useCatalogFeed';
import { useMediaNavigation } from '../hooks/useMediaNavigation';
import { useMediaUpdateSubscription } from '../hooks/useMediaUpdateSubscription';

export function ExplorePage() {
  const { t } = useTranslation();
  const { goToMedia } = useMediaNavigation();
  const feed = useCatalogFeed();

  useMediaUpdateSubscription(feed.updateItem);

  const handleSelectItem = (item: Media) => {
    goToMedia(item);
  };

  return (
    <>
      <SearchFilterBar
        search={
          <SearchBar
            onSearch={feed.onSearch}
            onClear={feed.onClearSearch}
            hasSearched={feed.isSearchMode}
            initialQuery={feed.currentQuery}
          />
        }
        filters={
          <FiltersToolbar
            selectedType={feed.currentSearchType}
            onTypeChange={feed.onTypeChange}
            disabled={feed.loading}
            selectedGenres={feed.selectedGenres}
            onGenresChange={feed.onGenresChange}
            showFiltersButton={!feed.isSearchMode}
          />
        }
      />

      <PageContainer>
        <div className="space-y-8 md:space-y-10">
          <PageHeader
            title={feed.isSearchMode ? t('explore.searchResults') : t('explore.trending')}
            description={t('explore.description')}
          />

          {feed.isSearchMode && !feed.isPerson && (
            <PersonSearchResults people={feed.people} onSelectPerson={feed.onPersonSelect} />
          )}

          <PaginatedMediaResults
            results={feed.results}
            loading={feed.loading}
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
