import type { Media } from '@findarr/shared/media';

import { FiltersToolbar } from '../components/catalog/FiltersToolbar';
import { SearchBar } from '../components/catalog/SearchBar';
import { CatalogResults } from '../components/explore/CatalogResults';
import { PageContainer } from '../components/ui/PageContainer';
import { SearchFilterBar } from '../components/ui/SearchFilterBar';
import { useCatalogFeed } from '../hooks/useCatalogFeed';
import { useMediaNavigation } from '../hooks/useMediaNavigation';

export function ExplorePage() {
  const { goToMedia } = useMediaNavigation();
  const feed = useCatalogFeed();

  const handleSelectItem = (item: Media) => {
    goToMedia(item, feed.persistHistoryState);
  };

  return (
    <>
      <SearchFilterBar
        search={
          <SearchBar
            onSearch={feed.onSearch}
            onClear={feed.onClearSearch}
            loading={feed.loading}
            hasSearched={feed.isSearchMode}
            initialQuery={feed.currentQuery}
          />
        }
        filters={
          <FiltersToolbar
            disableWrapper
            selectedType={feed.currentSearchType}
            onTypeChange={feed.onTypeChange}
            disabled={feed.loading}
            selectedGenres={feed.selectedGenres}
            onGenresChange={feed.onGenresChange}
            showInteractionFilter={!feed.isSearchMode}
            interactionFilter={feed.interactionFilter}
            onInteractionFilterChange={feed.onInteractionFilterChange}
            showFiltersButton={!feed.isSearchMode}
          />
        }
      />

      <PageContainer>
        <CatalogResults
          results={feed.results}
          loading={feed.loading}
          loadingMore={feed.loadingMore}
          currentPage={feed.currentPage}
          totalPages={feed.totalPages}
          isSearchMode={feed.isSearchMode}
          currentSearchType={feed.currentSearchType}
          onSelectItem={handleSelectItem}
          onUpdateItem={feed.updateItem}
          onLoadMore={feed.loadMore}
        />
      </PageContainer>
    </>
  );
}
