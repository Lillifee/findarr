import type { Media } from '@findarr/shared/media';
import { useTranslation } from 'react-i18next';

import { ResultsGrid } from '../media/ResultsGrid';
import { Button } from '../ui/Button';
import { LoadingState, StateDisplay } from '../ui/StateDisplay';

interface CatalogResultsProps {
  results: Media[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onSelectItem: (item: Media) => void;
  onUpdateItem: (updatedItem: Media) => void;
  onLoadMore: () => void;
}

export function CatalogResults({
  results,
  loading,
  loadingMore,
  hasMore,
  onSelectItem,
  onUpdateItem,
  onLoadMore,
}: CatalogResultsProps) {
  const { t } = useTranslation();

  if (results.length === 0) {
    return loading ? <LoadingState /> : <StateDisplay title={t('common.noResults')} />;
  }

  return (
    <div id="results-section">
      <ResultsGrid results={results} onSelectItem={onSelectItem} onUpdateItem={onUpdateItem} />

      {hasMore && (
        <div className="mt-6 border-t border-zinc-800 pt-4 text-center md:mt-8 md:pt-6 md:pb-0">
          <Button variant="secondary" onClick={onLoadMore} disabled={loadingMore || loading}>
            {loadingMore ? t('common.loading') : t('common.loadMore')}
          </Button>
        </div>
      )}
    </div>
  );
}
