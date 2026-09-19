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
            hasSearched={feed.mode !== 'browse' || feed.currentQuery.length > 0}
            initialQuery={feed.currentQuery}
            discovery={feed.discovery}
            onRemoveDiscovery={feed.onDiscoveryRemove}
            suggestions={feed.suggestions}
            searchData={{
              genres: feed.suggestions.genres,
              keywords: feed.suggestions.keywords,
              people: feed.suggestions.people,
              results: feed.suggestions.results,
              loading: feed.suggestions.loading,
            }}
            onSelectGenre={feed.onGenreSelect}
            onSelectKeyword={feed.onKeywordSelect}
            onSelectPerson={feed.onPersonSelect}
            onSelectMedia={goToMedia}
            showPeople={feed.currentSearchType !== 'tv'}
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
            <>
              <PageHeader title={t('explore.title')} description={t('explore.description')} />
              {!showingSearchResults && (
                <SearchMatches
                  genres={feed.preferences.genres}
                  keywords={feed.preferences.keywords}
                  people={feed.preferences.people}
                  results={feed.preferences.results}
                  onSelectGenre={feed.onGenreSelect}
                  onSelectKeyword={feed.onKeywordSelect}
                  onSelectPerson={feed.onPersonSelect}
                  onSelectMedia={goToMedia}
                  showPeople={feed.currentSearchType !== 'tv'}
                  className="w-full"
                />
              )}
            </>
          )}

          <PaginatedMediaResults
            results={showingSearchResults ? feed.searchResults : feed.results}
            loading={showingSearchResults ? feed.searchLoading : feed.loading}
            loadingMore={showingSearchResults ? false : feed.loadingMore}
            hasMore={showingSearchResults ? false : feed.hasMore}
            showEmptyState={showingSearchResults || feed.mode !== 'browse'}
            onSelectItem={handleSelectItem}
            onUpdateItem={feed.updateItem}
            onLoadMore={feed.loadMore}
          />
        </div>
      </PageContainer>
    </>
  );
}
