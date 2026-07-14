import type { Media } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const title = item.name;
  const year = releaseYear(item.date);
  const isLiked = item.state?.interaction?.action === 'liked';
  const isDisliked = item.state?.interaction?.action === 'disliked';

  return (
    <div
      title={title}
      onClick={onSelect}
      className="group @container cursor-pointer transition-transform duration-300 hover:-translate-y-1"
    >
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-[0_14px_36px_rgba(0,0,0,0.22)] transition-all duration-300 group-hover:border-zinc-700 group-hover:shadow-[0_22px_56px_rgba(0,0,0,0.32)]">
        <div className="relative overflow-hidden bg-zinc-900">
          <div className="absolute top-1.5 right-1.5 left-1.5 z-10 flex items-start justify-between gap-1.5 md:top-3 md:right-3 md:left-3">
            {/* Status Badges */}
            <div className="shrink-0">
              {item.state?.record?.status && (
                <StatusBadge status={item.state.record.status} position="inline" />
              )}
            </div>

            {/* Media Type Corner Flag */}
            <div className="@container flex min-w-0 flex-1 justify-end">
              <MediaTypeBadge type={item.type} />
            </div>
          </div>

          {/* Poster Image */}
          {isDefined(item.posterPath) ? (
            <>
              <img
                src={tmdbImage(item.posterPath, 'w500')}
                alt={title}
                className="aspect-2/3 w-full object-cover transition-all duration-500 group-hover:scale-[1.03]"
              />
              <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-white/6 via-transparent to-black/12 opacity-75 transition-opacity duration-300 group-hover:opacity-100" />
            </>
          ) : (
            <div className="flex aspect-2/3 w-full items-center justify-center bg-linear-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-zinc-500">
              <span className="text-sm font-medium tracking-wide">{t('media.noPoster')}</span>
            </div>
          )}
        </div>

        {/* Bottom Dock with Actions */}
        <div className="flex min-h-12 items-center justify-between gap-2 border-t border-zinc-800 bg-zinc-950/95 px-2.5 py-1.5 md:px-3">
          <div className="flex min-w-0 items-center gap-1.5 text-[11px] leading-none font-semibold text-zinc-100">
            <span className="tracking-[0.14em] text-zinc-300 uppercase @max-[180px]:hidden">
              {year}
            </span>
            <span className="h-3 w-px bg-zinc-700 @max-[180px]:hidden" />
            <span className="flex shrink-0 items-center gap-1">
              <Icon filled className="text-amber-300" name="star" size="xs" weight={600} />
              {item.voteAverage.toFixed(1)}
            </span>
          </div>

          {/* Like/Dislike Buttons */}
          <div
            className="shrink-0"
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
