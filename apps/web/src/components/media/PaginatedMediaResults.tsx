import type { Media } from '@findarr/shared/media';
import { useTranslation } from 'react-i18next';

import { Button } from '../ui/Button';
import { LoadingState, StateDisplay } from '../ui/StateDisplay';
import { ResultsGrid } from './ResultsGrid';

interface PaginatedMediaResultsProps {
  results: Media[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onSelectItem: (item: Media) => void;
  onUpdateItem: (updatedItem: Media) => void;
  onLoadMore: () => void;
}

export function PaginatedMediaResults({
  results,
  loading,
  loadingMore,
  hasMore,
  onSelectItem,
  onUpdateItem,
  onLoadMore,
}: PaginatedMediaResultsProps) {
  const { t } = useTranslation();

  return (
    <section id="results-section">
      {loading && results.length === 0 && (
        <LoadingState className="flex min-h-[50vh] items-center justify-center" />
      )}

      {!loading && results.length === 0 && <StateDisplay title={t('common.noResults')} />}

      {!loading && results.length > 0 && (
        <ResultsGrid results={results} onSelectItem={onSelectItem} onUpdateItem={onUpdateItem} />
      )}

      {hasMore && (
        <div className="mt-6 border-t border-zinc-800 pt-4 text-center md:mt-8 md:pt-6 md:pb-0">
          <Button variant="secondary" onClick={onLoadMore} disabled={loadingMore || loading}>
            {loadingMore ? t('common.loading') : t('common.loadMore')}
          </Button>
        </div>
      )}
    </section>
  );
}
