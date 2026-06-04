import type { MovieDetails, TVDetails, Media } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';
import { useState } from 'react';

import { linkService } from '../services/api.js';
import { LikeDislikeButton } from './LikeDislikeButton.js';
import { StatusBadge, type StatusType } from './ui/StatusBadge.js';

interface MediaDetailsProps {
  media: MovieDetails | TVDetails;
  onVoteComplete?: () => void;
}

// Format helpers
const formatRuntime = (value: number | number[] | undefined) => {
  if (!isDefined(value)) {
    return 'Unknown';
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 'Unknown';
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
  // Track local media state for updates
  const [localMedia, setLocalMedia] = useState<MovieDetails | TVDetails>(media);

  // Common data extraction
  const title = media.name;
  const releaseDate = media.date;
  const releaseYear = (isDefined(releaseDate) && new Date(releaseDate).getFullYear()) || '';
  const posterUrl = isDefined(media.posterPath)
    ? `https://image.tmdb.org/t/p/w500${media.posterPath}`
    : undefined;
  const backdropUrl = isDefined(media.backdropPath)
    ? `https://image.tmdb.org/t/p/original${media.backdropPath}`
    : undefined;

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
    'rounded-xl border border-gray-700/50 bg-gray-800/68 px-3 py-2.5 backdrop-blur-md';
  const infoLabelClass = 'text-[10px] uppercase tracking-[0.14em] text-gray-400 font-semibold';

  // Build Radarr/Sonarr link
  const arrLink = isDefined(media.state?.record?.arrUrl)
    ? {
        url:
          media.type === 'movie'
            ? linkService.radarr({ mediaId: media.state.record.id })
            : linkService.sonarr({ mediaId: media.state.record.id }),
        label: media.type === 'movie' ? 'Radarr' : 'Sonarr',
      }
    : null;

  // Build Jellyfin link
  const jellyfinLink = isDefined(media.state?.record?.jellyfinId)
    ? {
        url: linkService.jellyfin({ mediaId: media.state.record.id }),
        label: 'Jellyfin',
      }
    : null;

  const actionLinks = [
    isDefined(trailerUrl) ? { key: 'trailer', url: trailerUrl, label: 'Trailer' } : null,
    isDefined(altTrailerUrl)
      ? { key: 'altTrailer', url: altTrailerUrl, label: 'Search Trailer' }
      : null,
    isDefined(media.homepage) ? { key: 'website', url: media.homepage, label: 'Website' } : null,
    isDefined(arrLink)
      ? { key: arrLink.label.toLowerCase(), url: arrLink.url, label: arrLink.label }
      : null,
    isDefined(jellyfinLink)
      ? { key: 'jellyfin', url: jellyfinLink.url, label: jellyfinLink.label }
      : null,
  ].filter((link): link is { key: string; url: string; label: string } => !!link);

  return (
    <div className="relative min-h-screen bg-gray-900">
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
          <div className="absolute inset-0 bg-linear-to-b from-gray-900/70 via-gray-900/90 to-gray-900" />
          <div className="absolute inset-0 bg-linear-to-r from-gray-900/95 via-gray-900/60 to-transparent" />
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
                className="mx-auto w-full max-w-xs rounded-lg shadow-2xl md:mx-0 md:w-56 lg:w-80 xl:w-96"
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
              {media.type === 'movie' && isDefined(media.tagline) && (
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
                <div className="flex w-full flex-wrap items-center overflow-hidden rounded-xl border border-gray-700/50 bg-gray-800/70 backdrop-blur-md">
                  <div className="flex min-w-0 flex-wrap gap-0">
                    {actionLinks.map((link, index) => (
                      <div key={link.key} className="contents">
                        {index > 0 && <div className="w-px bg-gray-700/60" />}
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 font-medium text-gray-100 no-underline transition-colors duration-200 hover:bg-gray-700/70 hover:text-white"
                        >
                          {link.key === 'trailer' ? (
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                            </svg>
                          ) : link.key === 'website' ? (
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4m-4-4h6m0 0V6m0 4v4"
                              />
                            </svg>
                          )}
                          <span>{link.label}</span>
                        </a>
                      </div>
                    ))}
                  </div>
                  {availabilityStatus && (
                    <>
                      <div className="ml-auto w-px bg-gray-700/60" />
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
                  <p className={infoLabelClass}>Media Type</p>
                  <div className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-white">
                    {media.type === 'movie' ? (
                      <svg
                        className="h-4 w-4 text-gray-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.8}
                          d="M7 4v12M13 4v12M3 7h4m6 0h4M3 10h14m-14 3h4m6 0h4M4 16h12a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-4 w-4 text-gray-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.8}
                          d="M7.5 14.5 7 16l-.7.7h7.4l-.7-.7-.5-1.5M3 11h14M4.5 14.5h11a1.5 1.5 0 001.5-1.5V4.5A1.5 1.5 0 0015.5 3h-11A1.5 1.5 0 003 4.5V13a1.5 1.5 0 001.5 1.5z"
                        />
                      </svg>
                    )}
                    <span>{media.type === 'movie' ? 'Movie' : 'TV Series'}</span>
                  </div>
                </div>

                <div className={infoTileClass}>
                  <p className={infoLabelClass}>Rating</p>
                  <div className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-white">
                    <svg className="h-4 w-4 text-amber-300" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span>{media.voteAverage.toFixed(1)}</span>
                    <span className="text-xs font-medium text-gray-400">
                      ({media.voteCount.toLocaleString()})
                    </span>
                  </div>
                </div>

                {isDefined(releaseDate) && (
                  <div className={infoTileClass}>
                    <p className={infoLabelClass}>Release Date</p>
                    <div className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-gray-100">
                      <svg
                        className="h-4 w-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span>{releaseDate}</span>
                    </div>
                  </div>
                )}

                {media.type === 'movie' ? (
                  <div className={infoTileClass}>
                    <p className={infoLabelClass}>Duration</p>
                    <div className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-gray-100">
                      <svg
                        className="h-4 w-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>{formatRuntime(media.runtime)}</span>
                    </div>
                  </div>
                ) : (
                  <div className={infoTileClass}>
                    <p className={infoLabelClass}>Seasons / Episodes</p>
                    <p className="mt-1.5 text-sm font-semibold text-gray-100">
                      {media.numberOfSeasons} / {media.numberOfEpisodes}
                    </p>
                  </div>
                )}

                <div className={infoTileClass}>
                  <p className={infoLabelClass}>TMDB Status</p>
                  <p className="mt-1.5 truncate text-sm font-semibold text-gray-100">
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
                        className="inline-flex items-center rounded-full border border-gray-700/60 bg-gray-800/72 px-3 py-1 text-xs text-gray-200 backdrop-blur-sm"
                      >
                        {genre.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Overview */}
            {isDefined(media.overview) && (
              <div className="mb-8">
                <h2 className="mb-3 text-2xl font-semibold text-white drop-shadow-md">Overview</h2>
                <p className="text-lg leading-relaxed text-gray-200 drop-shadow-sm">
                  {media.overview}
                </p>
              </div>
            )}

            {/* Cast section - Responsive grid */}
            {topCast.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-4 text-2xl font-semibold text-white drop-shadow-md">Cast</h2>
                <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                  {topCast.map((actor) => (
                    <div key={actor.id} className="flex flex-col items-center">
                      {isDefined(actor.profilePath) ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w185${actor.profilePath}`}
                          alt={actor.name}
                          className="mb-2 h-20 w-20 rounded-full border border-gray-700/50 object-cover shadow-lg"
                        />
                      ) : (
                        <div className="mb-2 flex h-20 w-20 items-center justify-center rounded-full border border-gray-700/50 bg-gray-800/70 shadow-lg">
                          <svg
                            className="h-10 w-10 text-gray-500"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                              clipRule="evenodd"
                            />
                          </svg>
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

            {/* Score Breakdown */}
            {/* {media.state?.score && (
              <div className="mb-8">
                <ScoreBreakdown score={media.state.score} />
              </div>
            )} */}

            {/* Keywords */}
            {media.keywords && media.keywords.length > 0 && (
              <div className="mb-8">
                <h3 className="mb-3 text-xl font-semibold text-white drop-shadow-md">Keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {media.keywords.map((keyword) => (
                    <span
                      key={keyword.id}
                      className="rounded-full border border-gray-700/50 bg-gray-800/70 px-3 py-1 text-sm text-gray-200 backdrop-blur-sm"
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
      <div className="fixed right-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 z-40 border-t border-gray-700/50 bg-gray-800/90 shadow-2xl backdrop-blur-md md:bottom-0 md:left-64 md:z-30">
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
            onUpdate={(updatedMedia: Media) => {
              // TODO fix media details
              // oxlint-disable-next-line typescript/no-unsafe-type-assertion
              setLocalMedia(updatedMedia as MovieDetails | TVDetails);
              onVoteComplete?.();
            }}
          />
        </div>
      </div>
    </div>
  );
}
