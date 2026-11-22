import type { SearchType } from '@findarr/shared/media';
import { useTranslation } from 'react-i18next';

import { ExploreQuickFilters } from '../components/catalog/ExploreQuickFilters';
import { SearchBar } from '../components/catalog/SearchBar';
import { SearchMatches } from '../components/catalog/SearchMatches';
import { PaginatedMediaResults } from '../components/media/PaginatedMediaResults';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { SearchFilterBar } from '../components/ui/SearchFilterBar';
import { SegmentedControl, type SegmentedControlOption } from '../components/ui/SegmentedControl';
import { LoadingState } from '../components/ui/StateDisplay';
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

  const showingSearchResults = feed.currentQuery.length > 0;

  return (
    <>
      <SearchFilterBar
        search={
          <SearchBar
            onSearch={feed.onSearch}
            onSearchPreview={feed.onSearchPreview}
            onSubmitSearch={feed.onSubmitSearch}
            onClear={feed.onClearSearch}
            hasSearched={feed.mode !== 'browse' || showingSearchResults}
            initialQuery={feed.currentQuery}
            discovery={feed.discovery}
            onRemoveDiscovery={feed.onDiscoveryRemove}
            suggestions={feed.suggestions}
            onSelectGenre={feed.onGenreSelect}
            onSelectKeyword={feed.onKeywordSelect}
            onSelectPerson={feed.onPersonSelect}
            onSelectDateRange={feed.onDateRangeSelect}
            onSelectProvider={feed.onProviderSelect}
            onSelectMedia={goToMedia}
            showPeople={feed.currentSearchType !== 'tv'}
          />
        }
        filters={
          <SegmentedControl
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
        <div className="space-y-6 md:space-y-8">
          <PageHeader title={t('explore.title')} description={t('explore.description')} />

          {feed.mode === 'browse' &&
            !showingSearchResults &&
            (feed.preferences.loading ? (
              <LoadingState className="flex min-h-[50vh] items-center justify-center" />
            ) : (
              <div className="space-y-3">
                <ExploreQuickFilters
                  providers={feed.preferences.providers}
                  onSelectFilters={feed.onSelectFilters}
                />
                <SearchMatches
                  genres={feed.preferences.genres}
                  keywords={feed.preferences.keywords}
                  people={feed.preferences.people}
                  providers={feed.preferences.providers}
                  onSelectGenre={feed.onGenreSelect}
                  onSelectKeyword={feed.onKeywordSelect}
                  onSelectPerson={feed.onPersonSelect}
                  onSelectDateRange={feed.onDateRangeSelect}
                  onSelectProvider={feed.onProviderSelect}
                  showPeople={feed.currentSearchType !== 'tv'}
                />
              </div>
            ))}

          <PaginatedMediaResults
            results={showingSearchResults ? feed.searchResults : feed.results}
            loading={showingSearchResults ? feed.searchLoading : feed.loading}
            loadingMore={showingSearchResults ? false : feed.loadingMore}
            hasMore={showingSearchResults ? false : feed.hasMore}
            showEmptyState={showingSearchResults || feed.mode !== 'browse'}
            onSelectItem={goToMedia}
            onUpdateItem={feed.updateItem}
            onLoadMore={feed.loadMore}
          />
        </div>
      </PageContainer>
    </>
  );
}
