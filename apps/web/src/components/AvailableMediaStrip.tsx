import { isDefined, type Media } from '@findarr/shared';
import type { KeyboardEvent } from 'react';

function keyOf(item: Media) {
  return `${item.type}_${item.tmdbId}`;
}

export function AvailableMediaStrip({
  hasMore,
  loading,
  onSelectItem,
  results,
}: {
  hasMore: boolean;
  loading: boolean;
  onSelectItem: (item: Media) => void;
  results: Media[];
}) {
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
              key={index}
              className="h-48 w-32 shrink-0 animate-pulse rounded-xl border border-gray-700/60 bg-gray-800/70 sm:w-36 md:h-52 md:w-40"
            />
          ))}
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-700/70 bg-gray-800/40 px-5 py-8 text-sm text-gray-400">
        No newly available titles yet.
      </div>
    );
  }

  const fadeStyle = hasMore
    ? {
        WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 5rem), transparent)',
        maskImage: 'linear-gradient(to right, black calc(100% - 5rem), transparent)',
      }
    : undefined;

  return (
    <div className="relative overflow-hidden">
      <div className="scrollbar-hidden overflow-x-auto overflow-y-hidden" style={fadeStyle}>
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
              <div className="relative overflow-hidden rounded-xl border border-gray-700/60 bg-gray-800/75 shadow-lg transition-all duration-300 group-hover:border-gray-500/90 group-hover:shadow-2xl">
                {isDefined(item.posterPath) ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w342${item.posterPath}`}
                    alt={item.name}
                    className="aspect-2/3 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex aspect-2/3 w-full items-center justify-center bg-linear-to-br from-gray-800 via-gray-700 to-gray-800 text-xs font-medium text-gray-500">
                    No Poster
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/92 via-black/58 to-transparent px-2 pt-7 pb-2">
                  <p className="line-clamp-2 text-[11px] leading-tight font-semibold text-white md:text-xs">
                    {item.name}
                  </p>
                  <p className="mt-1 text-[10px] tracking-[0.16em] text-gray-300 uppercase">
                    {isDefined(item.date) ? new Date(item.date).getFullYear() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
