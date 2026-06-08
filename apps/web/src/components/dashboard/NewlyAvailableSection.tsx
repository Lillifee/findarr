import type { Media } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';

import { AvailableMediaStrip } from '../media/AvailableMediaStrip';
import { Card } from '../ui/Card';

interface NewlyAvailableSectionProps {
  results: Media[];
  hasMore: boolean;
  loading: boolean;
  error: string | undefined;
  onSelectItem: (item: Media) => void;
}

export function NewlyAvailableSection({
  results,
  hasMore,
  loading,
  error,
  onSelectItem,
}: NewlyAvailableSectionProps) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="text-xl font-semibold text-white md:text-2xl">Newly available</h2>
      </div>

      {isDefined(error) && !loading && (
        <Card className="mb-4 border border-red-500/30 text-sm text-red-200">{error}</Card>
      )}

      <AvailableMediaStrip
        hasMore={hasMore}
        loading={loading}
        onSelectItem={onSelectItem}
        results={results}
      />
    </section>
  );
}
