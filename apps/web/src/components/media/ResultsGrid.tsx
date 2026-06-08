import type { Media } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';

import { tmdbImage, releaseYear } from '../../utils/tmdb';
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
      <div className="relative overflow-hidden rounded-xl border border-gray-700/60 bg-gray-800/75 shadow-lg backdrop-blur-sm transition-all duration-300 group-hover:border-gray-500/90 group-hover:shadow-2xl">
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
          <div className="flex aspect-2/3 w-full items-center justify-center bg-linear-to-br from-gray-800 via-gray-700 to-gray-800 text-gray-500">
            <span className="text-sm font-medium tracking-wide">No Poster</span>
          </div>
        )}

        {/* Bottom Overlay with Info */}
        <div className="absolute right-0 bottom-0 left-0 z-10 bg-linear-to-t from-black/88 via-black/55 to-transparent px-3 pt-8 pb-3 md:px-4 md:pt-10 md:pb-4">
          <h3 className="mb-1.5 line-clamp-2 text-sm leading-tight font-semibold text-white transition-colors group-hover:text-gray-100 md:text-base">
            {title}
          </h3>

          <div className="mb-2.5 flex items-center justify-between gap-2">
            <span className="text-xs font-medium tracking-[0.18em] text-gray-300 uppercase md:text-[11px]">
              {year}
            </span>

            <div className="flex items-center gap-1.5 rounded-full border border-gray-600/70 bg-gray-900/70 px-2 py-1 text-xs backdrop-blur-sm md:px-2.5">
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
          <svg
            className="h-16 w-16 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
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
