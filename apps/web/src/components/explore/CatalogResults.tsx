import type { Media, SearchType } from '@findarr/shared/media';

import { ResultsGrid } from '../media/ResultsGrid';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';

interface CatalogResultsProps {
  results: Media[];
  loading: boolean;
  loadingMore: boolean;
  currentPage: number;
  totalPages: number;
  isSearchMode: boolean;
  currentSearchType: SearchType;
  onSelectItem: (item: Media) => void;
  onUpdateItem: (updatedItem: Media) => void;
  onLoadMore: () => void;
}

function getResultsTitle(isSearchMode: boolean, type: SearchType) {
  if (!isSearchMode) {
    return 'Trending & Popular';
  }

  if (type === 'movie') {
    return 'Movies';
  }

  if (type === 'tv') {
    return 'TV Shows';
  }

  return 'Movies & TV Shows';
}

export function CatalogResults({
  results,
  loading,
  loadingMore,
  currentPage,
  totalPages,
  isSearchMode,
  currentSearchType,
  onSelectItem,
  onUpdateItem,
  onLoadMore,
}: CatalogResultsProps) {
  const hasMore = currentPage < totalPages;

  if (results.length === 0) {
    if (loading) {
      return null;
    }

    return <EmptyState message={isSearchMode ? 'No results found.' : 'Loading content...'} />;
  }

  return (
    <div id="results-section">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-white md:text-3xl">
          {getResultsTitle(isSearchMode, currentSearchType)}
        </h2>
        <span className="text-xs text-gray-400 md:text-sm">
          {results.length.toLocaleString()}
          {hasMore ? '+' : ''} results loaded
        </span>
      </div>

      <ResultsGrid results={results} onSelectItem={onSelectItem} onUpdateItem={onUpdateItem} />

      {hasMore && (
        <div className="mt-6 border-t border-gray-700 pt-4 text-center md:mt-8 md:pt-6 md:pb-0">
          <Button onClick={onLoadMore} disabled={loadingMore || loading}>
            {loadingMore ? 'Loading...' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  );
}
