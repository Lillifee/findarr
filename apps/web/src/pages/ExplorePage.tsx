import type { Media, SearchType } from '@findarr/shared/media';
import { useTranslation } from 'react-i18next';

import { SearchBar } from '../components/catalog/SearchBar';
import { SearchMatches } from '../components/catalog/SearchMatches';
import { PaginatedMediaResults } from '../components/media/PaginatedMediaResults';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { SearchFilterBar } from '../components/ui/SearchFilterBar';
import { SegmentedControl, type SegmentedControlOption } from '../components/ui/SegmentedControl';
import { useCatalogFeed } from '../hooks/useCatalogFeed';
import { useMediaNavigation } from '../hooks/useMediaNavigation';
import { useMediaUpdateSubscription } from '../hooks/useMediaUpdateSubscription';

const mediaTypeOptions: SegmentedControlOption<SearchType>[] = [
  { value: 'movie', label: 'Movies', icon: 'movie' },
  { value: 'tv', label: 'Shows', icon: 'tv' },
];

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
            hasSearched={feed.mode !== 'browse'}
            initialQuery={feed.currentQuery}
            discovery={feed.discovery}
            onRemoveDiscovery={feed.onDiscoveryRemove}
          />
        }
        filters={
          <SegmentedControl
            ariaLabel={t('catalog.type')}
            options={mediaTypeOptions}
            selectedValue={feed.currentSearchType}
            onChange={feed.onTypeChange}
            renderLabel={(option) =>
              t(option.value === 'movie' ? 'catalog.typeMovies' : 'catalog.typeShows')
            }
          />
        }
      />

      <PageContainer>
        <div className="space-y-8 md:space-y-10">
          {feed.mode === 'browse' && (
            <PageHeader title={t('explore.title')} description={t('explore.description')} />
          )}

          {feed.mode !== 'discover' && (
            <SearchMatches
              genres={feed.genres}
              keywords={feed.keywords}
              people={feed.currentSearchType === 'tv' ? [] : feed.people}
              onSelectGenre={feed.onGenreSelect}
              onSelectKeyword={feed.onKeywordSelect}
              onSelectPerson={feed.onPersonSelect}
            />
          )}

          <PaginatedMediaResults
            results={feed.results}
            loading={feed.loading}
            loadingMore={feed.loadingMore}
            hasMore={feed.hasMore}
            showEmptyState={feed.mode !== 'browse'}
            onSelectItem={handleSelectItem}
            onUpdateItem={feed.updateItem}
            onLoadMore={feed.loadMore}
          />
        </div>
      </PageContainer>
    </>
  );
}
