import type { MovieDetails, TVDetails } from '@findarr/shared/media';
import { isDefined, isNotEmpty } from '@findarr/shared/utils';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { tmdbImage, tmdbImageOrUndefined } from '../../utils/tmdb';
import { Icon } from '../ui/Icon';
import { StatusBadge, type StatusType } from '../ui/StatusBadge';
import { LikeDislikeButton } from './LikeDislikeButton';

interface MediaDetailsProps {
  media: MovieDetails | TVDetails;
  onVoteComplete?: () => void;
}

// Format helpers
const formatRuntime = (value: number | number[] | undefined, unknown: string) => {
  if (!isDefined(value)) {
    return unknown;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return unknown;
    }
    if (value.length === 1) {
      return `${value[0]}m`;
    }
    return `${Math.min(...value)}-${Math.max(...value)}m per episode`;
  }
  const hours = Math.floor(value / 60);
  const remainingMinutes = value % 60;
  return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${value}m`;
};

export function MediaView({ media, onVoteComplete }: MediaDetailsProps) {
  const { t } = useTranslation();
  // Track local media state for updates
  const [localMedia, setLocalMedia] = useState<MovieDetails | TVDetails>(media);

  // Common data extraction
  const title = media.name;
  const releaseDate = media.date;
  const releaseYear = (isDefined(releaseDate) && new Date(releaseDate).getFullYear()) || '';
  const posterUrl = tmdbImageOrUndefined(media.posterPath, 'w500');
  const backdropUrl = tmdbImageOrUndefined(media.backdropPath, 'original');

  // Get first official YouTube trailer
  const trailer = media.videos?.find(
    (video) => video.site === 'YouTube' && video.type === 'Trailer' && video.official,
  );
  const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : undefined;
  const altTrailerUrl = trailer
    ? undefined
    : `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} ${releaseYear} trailer`)}`;

  // Get cast members - show more based on available data
  // Mobile: 6, Tablet: 8, Desktop: 10
  const availableCast = media.cast ?? [];
  const topCast = availableCast.slice(0, Math.min(10, availableCast.length));

  const availabilityStatus = media.state?.record?.status as StatusType | undefined;
  const infoTileClass =
    'rounded-xl border border-zinc-800/80 bg-zinc-950/72 px-3 py-2.5 backdrop-blur-sm';
  const infoLabelClass = 'text-[10px] uppercase tracking-[0.14em] text-zinc-400 font-semibold';

  // Build Radarr/Sonarr link
  const arrLink = isDefined(media.state?.record?.arrUrl)
    ? {
        url: media.state.record.arrUrl,
        label: media.type === 'movie' ? 'Radarr' : 'Sonarr',
      }
    : null;

  // Build library link (Jellyfin or Plex)
  const libLink = isDefined(media.state?.record?.libUrl)
    ? {
        url: media.state.record.libUrl,
        label: 'Watch',
      }
    : null;

  const actionLinks = [
    isDefined(trailerUrl)
      ? { key: 'trailer', url: trailerUrl, label: t('mediaView.trailer') }
      : null,
    isDefined(altTrailerUrl)
      ? { key: 'altTrailer', url: altTrailerUrl, label: t('mediaView.searchTrailer') }
      : null,
    isDefined(media.homepage)
      ? { key: 'website', url: media.homepage, label: t('mediaView.website') }
      : null,
    isDefined(arrLink)
      ? { key: arrLink.label.toLowerCase(), url: arrLink.url, label: arrLink.label }
      : null,
    isDefined(libLink) ? { key: 'watch', url: libLink.url, label: t('mediaView.watch') } : null,
  ].filter((link): link is { key: string; url: string; label: string } => !!link);

  return (
    <div className="relative min-h-screen bg-zinc-950">
      {/* Full-page backdrop background */}
      {isDefined(backdropUrl) && (
        <div className="fixed inset-0 z-0">
          <img
            src={backdropUrl}
            alt=""
            className="h-full w-full object-cover"
            style={{ objectPosition: 'center 30%' }}
          />
          {/* Gradient overlays for readability */}
          <div className="absolute inset-0 bg-linear-to-b from-zinc-950/70 via-zinc-950/90 to-zinc-950" />
          <div className="absolute inset-0 bg-linear-to-r from-zinc-950/95 via-zinc-950/62 to-transparent" />
        </div>
      )}

      {/* Content container */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 pb-28 md:px-8 md:py-16">
        {/* Main content grid: poster left, details right */}
        <div className="mb-12 flex flex-col gap-6 md:flex-row md:gap-8">
          {/* Poster */}
          {isDefined(posterUrl) && (
            <div className="shrink-0">
              <img
                src={posterUrl}
                alt={title}
                className="mx-auto w-full max-w-xs rounded-lg shadow-[0_26px_80px_rgba(0,0,0,0.42)] md:mx-0 md:w-56 lg:w-80 xl:w-96"
              />
            </div>
          )}

          {/* Details */}
          <div className="min-w-0 flex-1">
            {/* Title and tagline */}
            <div className="mb-6">
              <h1 className="mb-3 text-4xl font-bold text-white drop-shadow-lg md:text-5xl lg:text-6xl">
                {title}
              </h1>
              {media.type === 'movie' && isNotEmpty(media.tagline) && (
                <p className="text-xl text-gray-300 italic drop-shadow-md md:text-2xl">
                  &quot;{media.tagline}&quot;
                </p>
              )}
              {media.type === 'tv' && media.originalName !== media.name && (
                <p className="text-xl text-gray-300 italic drop-shadow-md md:text-2xl">
                  {media.originalName}
                </p>
              )}
            </div>

            {actionLinks.length > 0 && (
              <div>
                <div className="flex w-full flex-wrap items-center overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950/72 backdrop-blur-sm">
                  <div className="flex min-w-0 flex-wrap gap-0">
                    {actionLinks.map((link, index) => (
                      <div key={link.key} className="contents">
                        {index > 0 && <div className="w-px bg-zinc-800/80" />}
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 font-medium text-zinc-100 no-underline transition-colors duration-200 hover:bg-zinc-800/80 hover:text-white"
                        >
                          {link.key === 'trailer' ? (
                            <Icon filled name="play_arrow" size="sm" />
                          ) : link.key === 'website' ? (
                            <Icon name="public" size="sm" />
                          ) : (
                            <Icon name="open_in_new" size="sm" />
                          )}
                          <span>{link.label}</span>
                        </a>
                      </div>
                    ))}
                  </div>
                  {availabilityStatus && (
                    <>
                      <div className="ml-auto w-px bg-zinc-800/80" />
                      <div className="flex shrink-0 items-center px-4 py-2">
                        <StatusBadge status={availabilityStatus} size="sm" />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Quick info panel */}
            <div className="mt-2 mb-6 pt-2">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
                <div className={infoTileClass}>
                  <p className={infoLabelClass}>{t('mediaView.mediaType')}</p>
                  <div className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-white">
                    <Icon
                      className="text-zinc-300"
                      name={media.type === 'movie' ? 'movie' : 'tv'}
                      size="sm"
                    />
                    <span>
                      {media.type === 'movie' ? t('mediaView.movie') : t('mediaView.tvSeries')}
                    </span>
                  </div>
                </div>

                <div className={infoTileClass}>
                  <p className={infoLabelClass}>{t('mediaView.rating')}</p>
                  <div className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-white">
                    <Icon filled className="text-amber-300" name="star" size="sm" />
                    <span>{media.voteAverage.toFixed(1)}</span>
                    <span className="text-xs font-medium text-zinc-400">
                      ({media.voteCount.toLocaleString()})
                    </span>
                  </div>
                </div>

                {isNotEmpty(releaseDate) && (
                  <div className={infoTileClass}>
                    <p className={infoLabelClass}>{t('mediaView.releaseDate')}</p>
                    <div className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-gray-100">
                      <Icon className="text-zinc-400" name="calendar_month" size="sm" />
                      <span>{releaseDate}</span>
                    </div>
                  </div>
                )}

                {media.type === 'movie' ? (
                  <div className={infoTileClass}>
                    <p className={infoLabelClass}>{t('mediaView.duration')}</p>
                    <div className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-zinc-100">
                      <Icon className="text-zinc-400" name="schedule" size="sm" />
                      <span>{formatRuntime(media.runtime, t('mediaView.unknown'))}</span>
                    </div>
                  </div>
                ) : (
                  <div className={infoTileClass}>
                    <p className={infoLabelClass}>{t('mediaView.episodes')}</p>
                    <p className="mt-1.5 text-sm font-semibold text-zinc-100">
                      {media.numberOfSeasons} / {media.numberOfEpisodes}
                    </p>
                  </div>
                )}

                <div className={infoTileClass}>
                  <p className={infoLabelClass}>{t('mediaView.tmdbStatus')}</p>
                  <p className="mt-1.5 truncate text-sm font-semibold text-zinc-100">
                    {media.status}
                  </p>
                </div>
              </div>

              {isDefined(media.genres) && media.genres.length > 0 && (
                <div className="mt-2 pt-2">
                  <div className="flex flex-wrap gap-2">
                    {media.genres.map((genre) => (
                      <span
                        key={genre.id}
                        className="inline-flex items-center rounded-full border border-zinc-800/80 bg-zinc-950/72 px-3 py-1 text-xs text-zinc-200 backdrop-blur-sm"
                      >
                        {genre.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Overview */}
            {isNotEmpty(media.overview) && (
              <div className="mb-8">
                <h2 className="mb-3 text-2xl font-semibold text-white drop-shadow-md">
                  {t('mediaView.overview')}
                </h2>
                <p className="text-lg leading-relaxed text-gray-200 drop-shadow-sm">
                  {media.overview}
                </p>
              </div>
            )}

            {/* Cast section - Responsive grid */}
            {topCast.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-4 text-2xl font-semibold text-white drop-shadow-md">
                  {t('mediaView.cast')}
                </h2>
                <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                  {topCast.map((actor) => (
                    <div key={actor.id} className="flex flex-col items-center">
                      {isDefined(actor.profilePath) ? (
                        <img
                          src={tmdbImage(actor.profilePath, 'w185')}
                          alt={actor.name}
                          className="mb-2 h-20 w-20 rounded-full border border-zinc-800/80 object-cover shadow-lg"
                        />
                      ) : (
                        <div className="mb-2 flex h-20 w-20 items-center justify-center rounded-full border border-zinc-800/80 bg-zinc-900/80 shadow-lg">
                          <Icon filled className="text-zinc-500" name="person" size="xl" />
                        </div>
                      )}
                      <div className="w-full text-center">
                        <p className="truncate text-xs font-medium text-white">{actor.name}</p>
                        <p className="text-2xs truncate text-gray-400">{actor.character}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Keywords */}
            {media.keywords && media.keywords.length > 0 && (
              <div className="mb-8">
                <h3 className="mb-3 text-xl font-semibold text-white drop-shadow-md">
                  {t('mediaView.keywords')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {media.keywords.map((keyword) => (
                    <span
                      key={keyword.id}
                      className="rounded-full border border-zinc-800/80 bg-zinc-950/72 px-3 py-1 text-sm text-zinc-200 backdrop-blur-sm"
                    >
                      {keyword.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Like/Dislike buttons at bottom - Always centered, above mobile nav but behind desktop sidebar */}
      <div className="fixed right-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 z-40 border-t border-zinc-800/80 bg-zinc-950/95 shadow-[0_-18px_50px_rgba(0,0,0,0.28)] backdrop-blur-sm md:bottom-0 md:left-64 md:z-30">
        <div className="mx-auto flex w-full max-w-7xl justify-center px-4 py-3 md:px-8 md:py-4">
          <LikeDislikeButton
            tmdbId={localMedia.tmdbId}
            mediaType={localMedia.type}
            initialAction={
              localMedia.state?.interactions?.find((i) => i.action === 'liked')
                ? 'liked'
                : localMedia.state?.interactions?.find((i) => i.action === 'disliked')
                  ? 'disliked'
                  : null
            }
            existingMedia={localMedia}
            onUpdate={(updatedMedia) => {
              setLocalMedia(updatedMedia);
              onVoteComplete?.();
            }}
          />
        </div>
      </div>
    </div>
  );
}
