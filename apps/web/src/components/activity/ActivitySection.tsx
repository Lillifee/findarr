import type { Media } from '@findarr/shared/media';

import { ResultsGrid } from '../media/ResultsGrid';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { LoadingState, StateDisplay } from '../ui/StateDisplay';

interface ActivitySectionProps {
  results: Media[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onSelectItem: (item: Media) => void;
  onUpdateItem: (updatedItem: Media) => void;
  onLoadMore: () => void;
}

export function ActivitySection({
  results,
  loading,
  loadingMore,
  hasMore,
  onSelectItem,
  onUpdateItem,
  onLoadMore,
}: ActivitySectionProps) {
  return (
    <section id="results-section">
      {loading && results.length === 0 && <LoadingState title="Loading your activity..." />}

      {!loading && results.length === 0 && (
        <StateDisplay
          className="py-20"
          icon={<Icon className="text-zinc-600" name="fact_check" size="display" />}
          title="No activity yet"
          message="You have not voted on any media yet. Start exploring and your personal request activity will show up here."
        />
      )}

      {!loading && results.length > 0 && (
        <ResultsGrid results={results} onSelectItem={onSelectItem} onUpdateItem={onUpdateItem} />
      )}

      {hasMore && (
        <div className="pt-6 md:pt-8 md:pb-0">
          <div className="border-t border-zinc-800 pt-4 text-center md:pt-6 md:pb-0">
            <Button variant="secondary" onClick={onLoadMore} disabled={loadingMore}>
              {loadingMore ? 'Loading...' : 'Load more'}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
