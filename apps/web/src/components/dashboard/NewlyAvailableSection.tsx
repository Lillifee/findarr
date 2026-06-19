import type { Media } from '@findarr/shared/media';
import { useTranslation } from 'react-i18next';

import { AvailableMediaStrip } from '../media/AvailableMediaStrip';

interface NewlyAvailableSectionProps {
  results: Media[];
  loading: boolean;
  onSelectItem: (item: Media) => void;
}

export function NewlyAvailableSection({
  results,
  loading,
  onSelectItem,
}: NewlyAvailableSectionProps) {
  const { t } = useTranslation();
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="text-xl font-semibold text-white md:text-2xl">
          {t('media.newlyAvailable')}
        </h2>
      </div>

      <AvailableMediaStrip loading={loading} onSelectItem={onSelectItem} results={results} />
    </section>
  );
}
