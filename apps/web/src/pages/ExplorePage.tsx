import type { Media } from '@findarr/shared/media';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { FiltersToolbar } from '../components/catalog/FiltersToolbar';
import { SearchBar } from '../components/catalog/SearchBar';
import { CatalogResults } from '../components/explore/CatalogResults';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { SearchFilterBar } from '../components/ui/SearchFilterBar';
import { useMediaUpdates } from '../contexts/MediaUpdateContext';
import { useCatalogFeed } from '../hooks/useCatalogFeed';
import { useMediaNavigation } from '../hooks/useMediaNavigation';

export function ExplorePage() {
  const { t } = useTranslation();
  const { goToMedia } = useMediaNavigation();
  const mediaUpdates = useMediaUpdates();
  const feed = useCatalogFeed();

  useEffect(() => mediaUpdates?.subscribe(feed.updateItem), [feed.updateItem, mediaUpdates]);

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

          <CatalogResults
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
