import type { Media } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';
import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { tmdbImage } from '../../utils/tmdb';

function keyOf(item: Media) {
  return `${item.type}_${item.tmdbId}`;
}

export function AvailableMediaStrip({
  loading,
  results,
  onSelectItem,
}: {
  loading: boolean;
  results: Media[];
  onSelectItem: (item: Media) => void;
}) {
  const { t } = useTranslation();
  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>, item: Media) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    onSelectItem(item);
  };

  if (loading && results.length === 0) {
    return (
      <div className="scrollbar-hidden overflow-x-auto overflow-y-hidden">
        <div className="flex gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              // oxlint-disable-next-line react/no-array-index-key
              key={index}
              className="h-48 w-32 shrink-0 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/35 sm:w-36 md:h-52 md:w-40"
            />
          ))}
        </div>
      </div>
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
    <div className="relative overflow-hidden">
      <div
        className="scrollbar-hidden overflow-x-auto overflow-y-hidden"
        style={{
          WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 5rem), transparent)',
          maskImage: 'linear-gradient(to right, black calc(100% - 5rem), transparent)',
        }}
      >
        <div className="flex gap-3 md:gap-4">
          {results.map((item) => (
            <div
              key={keyOf(item)}
              role="button"
              tabIndex={0}
              onClick={() => {
                onSelectItem(item);
              }}
              onKeyDown={(event) => {
                handleCardKeyDown(event, item);
              }}
              className="group w-32 shrink-0 cursor-pointer transition-transform duration-300 sm:w-36 md:w-40"
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
