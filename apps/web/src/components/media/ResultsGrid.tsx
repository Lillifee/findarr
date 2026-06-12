import type { Media } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';

import { tmdbImage, releaseYear } from '../../utils/tmdb';
import { Icon } from '../ui/Icon';
import { MediaTypeBadge } from '../ui/MediaTypeBadge';
import { StatusBadge } from '../ui/StatusBadge';
import { LikeDislikeButton } from './LikeDislikeButton';

interface MediaCardProps {
  item: Media;
  onSelect: () => void;
  onUpdate?: (updatedItem: Media) => void;
}

function MediaCard({ item, onSelect, onUpdate }: MediaCardProps) {
  const title = item.name;
  const year = releaseYear(item.date);
  const isLiked = item.state?.interactions?.find((i) => i.action === 'liked');
  const isDisliked = item.state?.interactions?.find((i) => i.action === 'disliked');

  return (
    <div
      onClick={onSelect}
      className="group cursor-pointer transition-transform duration-300 hover:-translate-y-1"
    >
      <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-[0_14px_36px_rgba(0,0,0,0.22)] transition-all duration-300 group-hover:border-zinc-700 group-hover:shadow-[0_22px_56px_rgba(0,0,0,0.32)]">
        {/* Status Badges */}
        {item.state?.record?.status && (
          <StatusBadge status={item.state.record.status} position="top-left" />
        )}

        {/* Media Type Corner Flag */}
        <MediaTypeBadge type={item.type} />

        {/* Poster Image */}
        {isDefined(item.posterPath) ? (
          <>
            <img
              src={tmdbImage(item.posterPath, 'w500')}
              alt={title}
              className="aspect-2/3 w-full object-cover transition-all duration-500 group-hover:scale-[1.03]"
            />
            <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-white/6 via-transparent to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-100" />
          </>
        ) : (
          <div className="flex aspect-2/3 w-full items-center justify-center bg-linear-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-zinc-500">
            <span className="text-sm font-medium tracking-wide">No Poster</span>
          </div>
        )}

        {/* Bottom Overlay with Info */}
        <div className="absolute right-0 bottom-0 left-0 z-10 bg-linear-to-t from-black/88 via-black/55 to-transparent px-3 pt-8 pb-3 md:px-4 md:pt-10 md:pb-4">
          <h3 className="mb-1.5 line-clamp-2 text-sm leading-tight font-semibold text-white transition-colors group-hover:text-zinc-100 md:text-base">
            {title}
          </h3>

          <div className="mb-2.5 flex items-center justify-between gap-2">
            <span className="text-xs font-medium tracking-[0.18em] text-zinc-300 uppercase md:text-[11px]">
              {year}
            </span>

            <div className="flex items-center gap-1.5 rounded-full border border-zinc-700/80 bg-zinc-950/75 px-2 py-1 text-xs backdrop-blur-sm md:px-2.5">
              <span className="text-xs text-amber-300">★</span>
              <span className="text-xs font-semibold text-white">
                {item.voteAverage.toFixed(1)}
              </span>
            </div>
          </div>

          {/* Like/Dislike Buttons */}
          <div
            className="flex justify-center"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <LikeDislikeButton
              tmdbId={item.tmdbId}
              mediaType={item.type}
              initialAction={isLiked ? 'liked' : isDisliked ? 'disliked' : null}
              existingMedia={item}
              {...(onUpdate && { onUpdate })}
              compact
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface ResultsGridProps {
  results: Media[];
  onSelectItem: (item: Media) => void;
  onUpdateItem?: (updatedItem: Media) => void;
}

export function ResultsGrid({ results, onSelectItem, onUpdateItem }: ResultsGridProps) {
  if (results.length === 0) {
    return (
      <div className="py-16 text-center text-gray-400">
        <div className="flex flex-col items-center gap-4">
          <Icon className="text-zinc-600" name="search" size="display" />
          <p className="text-lg">No results found</p>
          <p className="text-sm text-gray-500">Try adjusting your search or filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {results.map((item) => (
        <MediaCard
          key={item.tmdbId}
          item={item}
          onSelect={() => {
            onSelectItem(item);
          }}
          {...(onUpdateItem ? { onUpdate: onUpdateItem } : {})}
        />
      ))}
    </div>
  );
}
