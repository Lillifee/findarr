import type { Media } from '@findarr/shared/media';

import { ResultsGrid } from '../media/ResultsGrid';

interface AttentionQueueSectionProps {
  results: Media[];
  loading: boolean;
  onSelectItem: (item: Media) => void;
  onUpdateItem: (updatedItem: Media) => void;
}

export function AttentionQueueSection({
  results,
  loading,
  onSelectItem,
  onUpdateItem,
}: AttentionQueueSectionProps) {
  if (!loading && results.length === 0) {
    return null;
  }

  return (
    <section className="mb-10 rounded-3xl border border-amber-500/20 bg-linear-to-br from-amber-500/10 via-gray-900/70 to-orange-500/10 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.35)] md:p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <p className="text-xs font-semibold tracking-[0.28em] text-amber-200/80 uppercase">Queue</p>

        {!loading && results.length > 0 && (
          <div className="text-xs text-amber-100/80 md:text-sm">
            {results.length.toLocaleString()} item{results.length === 1 ? '' : 's'}
          </div>
        )}
      </div>

      {loading && results.length === 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm text-gray-300">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-300/40 border-t-amber-300" />
          <span>Loading attention items...</span>
        </div>
      )}

      {!loading && results.length > 0 && (
        <ResultsGrid results={results} onSelectItem={onSelectItem} onUpdateItem={onUpdateItem} />
      )}
    </section>
  );
}
