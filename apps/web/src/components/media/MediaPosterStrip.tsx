import type { Media } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';
import { useTranslation } from 'react-i18next';

import { tmdbImage } from '../../utils/tmdb';
import { HorizontalRail } from '../ui/HorizontalRail';

function keyOf(item: Media) {
  return `${item.type}_${item.tmdbId}`;
}

export function MediaPosterStrip({
  loading,
  results,
  onSelectItem,
  ariaLabel,
}: {
  loading: boolean;
  results: Media[];
  onSelectItem: (item: Media) => void;
  ariaLabel?: string;
}) {
  const { t } = useTranslation();
  const railLabel = ariaLabel ?? t('media.newlyAvailable');

  if (loading && results.length === 0) {
    return (
      <HorizontalRail
        ariaLabel={railLabel}
        contentClassName="flex gap-3"
        nextLabel={t('common.next')}
        previousLabel={t('common.previous')}
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            // oxlint-disable-next-line react/no-array-index-key
            key={index}
            className="h-48 w-32 shrink-0 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/35 sm:w-36 md:h-52 md:w-40"
          />
        ))}
      </HorizontalRail>
    );
  }

  if (results.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/35 px-5 py-8 text-sm text-zinc-400">
        {t('media.noNewlyAvailable')}
      </div>
    );
  }

  return (
    <HorizontalRail
      ariaLabel={railLabel}
      contentClassName="flex gap-3 md:gap-4"
      nextLabel={t('common.next')}
      previousLabel={t('common.previous')}
    >
      {results.map((item) => (
        <button
          key={keyOf(item)}
          onClick={() => {
            onSelectItem(item);
          }}
          type="button"
          className="group w-32 shrink-0 text-left transition-transform duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 sm:w-36 md:w-40"
        >
          <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-[0_14px_36px_rgba(0,0,0,0.22)] transition-all duration-300 group-hover:border-zinc-700 group-hover:shadow-[0_22px_56px_rgba(0,0,0,0.32)]">
            {isDefined(item.posterPath) ? (
              <img
                src={tmdbImage(item.posterPath, 'w342')}
                alt={item.name}
                className="aspect-2/3 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            ) : (
              <div className="flex aspect-2/3 w-full items-center justify-center bg-linear-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-xs font-medium text-zinc-500">
                {t('media.noPoster')}
              </div>
            )}
          </div>
        </button>
      ))}
    </HorizontalRail>
  );
}
