import type { Media } from '@findarr/shared/media';

import { ResultsGrid } from '../media/ResultsGrid';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Spinner } from '../ui/Spinner';

const emptyIcon = (
  <svg className="h-24 w-24 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
    />
  </svg>
);

interface ActivitySectionProps {
  results: Media[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  currentPage: number;
  totalPages: number;
  onSelectItem: (item: Media) => void;
  onUpdateItem: (updatedItem: Media) => void;
  onLoadMore: () => void;
}

export function ActivitySection({
  results,
  loading,
  loadingMore,
  hasMore,
  currentPage,
  totalPages,
  onSelectItem,
  onUpdateItem,
  onLoadMore,
}: ActivitySectionProps) {
  return (
    <section id="results-section">
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <h2 className="text-xl font-bold text-white md:text-3xl">Your Activity</h2>

          <div className="text-xs text-gray-400 md:text-sm">
            {results.length.toLocaleString()}
            {currentPage < totalPages ? '+' : ''} items loaded
          </div>
        </div>
      </div>

      {loading && results.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Spinner className="mx-auto mb-4" />
            <p className="text-gray-400">Loading your activity...</p>
          </div>
        </div>
      )}

      {!loading && results.length === 0 && (
        <EmptyState
          className="py-20"
          icon={emptyIcon}
          title="No activity yet"
          message="You have not voted on any media yet. Start exploring and your personal request activity will show up here."
        />
      )}

      {!loading && results.length > 0 && (
        <ResultsGrid results={results} onSelectItem={onSelectItem} onUpdateItem={onUpdateItem} />
      )}

      {hasMore && (
        <div className="pt-6 md:pt-8 md:pb-0">
          <div className="border-t border-gray-700 pt-4 text-center md:pt-6 md:pb-0">
            <Button onClick={onLoadMore} disabled={loadingMore}>
              {loadingMore ? 'Loading...' : 'Load more'}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
