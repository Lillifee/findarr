import type { Media } from '@findarr/shared/media';
import { useTranslation } from 'react-i18next';

import { ResultsGrid } from '../media/ResultsGrid';

interface AttentionQueueSectionProps {
  results: Media[];
  onSelectItem: (item: Media) => void;
  onUpdateItem: (updatedItem: Media) => void;
}

export function AttentionQueueSection({
  results,
  onSelectItem,
  onUpdateItem,
}: AttentionQueueSectionProps) {
  const { t } = useTranslation();
  if (results.length === 0) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-amber-500/20 bg-linear-to-br from-amber-500/10 via-gray-900/70 to-orange-500/10 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.35)] md:p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <p className="text-xs font-semibold tracking-[0.28em] text-amber-200/80 uppercase">
          {t('activity.queue')}
        </p>
      </div>

      <ResultsGrid results={results} onSelectItem={onSelectItem} onUpdateItem={onUpdateItem} />
    </section>
  );
}
