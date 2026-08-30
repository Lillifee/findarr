import type { Media } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';
import { useTranslation } from 'react-i18next';

import { FiltersToolbar } from '../components/catalog/FiltersToolbar';
import { GenreSearchResults } from '../components/catalog/GenreSearchResults';
import { KeywordSearchResults } from '../components/catalog/KeywordSearchResults';
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
            showMediaType={!feed.isDiscovery}
            showFiltersButton={!feed.isSearchMode}
          />
        }
      />

      <PageContainer>
        <div className="space-y-8 md:space-y-10">
          <PageHeader
            title={feed.isSearchMode ? t('explore.searchResults') : t('explore.trending')}
            description={
              feed.isDiscovery && isDefined(feed.discoveryName)
                ? t('explore.discovering', { name: feed.discoveryName })
                : t('explore.description')
            }
          />

          {feed.isSearchMode && !feed.isDiscovery && (
            <GenreSearchResults genres={feed.genres} onSelectGenre={feed.onGenreSelect} />
          )}

          {feed.isSearchMode && !feed.isDiscovery && (
            <KeywordSearchResults keywords={feed.keywords} onSelectKeyword={feed.onKeywordSelect} />
          )}

          {feed.isSearchMode && !feed.isDiscovery && (
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
