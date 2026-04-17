import type { MovieDetails, TVDetails, Media } from '@findarr/shared';
import { useState } from 'react';
import { linkService } from '../services/api.js';
import { LikeDislikeButton } from './LikeDislikeButton';
import { StatusBadge, type StatusType } from './ui/StatusBadge';

interface MediaDetailsProps {
  media: MovieDetails | TVDetails;
  onVoteComplete?: () => void;
}

export function MediaView({ media, onVoteComplete }: MediaDetailsProps) {
  // Track local media state for updates
  const [localMedia, setLocalMedia] = useState<MovieDetails | TVDetails>(media);

  // Common data extraction
  const title = media.name;
  const releaseDate = media.date;
  const posterUrl = media.posterPath
    ? `https://image.tmdb.org/t/p/w500${media.posterPath}`
    : undefined;
  const backdropUrl = media.backdropPath
    ? `https://image.tmdb.org/t/p/original${media.backdropPath}`
    : undefined;

  // Get first official YouTube trailer
  const trailer = media.videos?.find(
    video => video.site === 'YouTube' && video.type === 'Trailer' && video.official
  );
  const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : undefined;

  // Get cast members - show more based on available data
  // Mobile: 6, Tablet: 8, Desktop: 10
  const availableCast = media.cast ?? [];
  const topCast = availableCast.slice(0, Math.min(10, availableCast.length));

  // Format helpers
  const formatRuntime = (value: number | number[] | undefined) => {
    if (!value) return 'Unknown';
    if (Array.isArray(value)) {
      if (value.length === 0) return 'Unknown';
      if (value.length === 1) return `${value[0]}m`;
      return `${Math.min(...value)}-${Math.max(...value)}m per episode`;
    }
    const hours = Math.floor(value / 60);
    const remainingMinutes = value % 60;
    return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${value}m`;
  };

  const availabilityStatus = media.state?.record?.status as StatusType | undefined;
  const infoTileClass =
    'rounded-lg bg-gray-800/45 border border-gray-700/60 px-3 py-2 backdrop-blur-sm';
  const infoLabelClass = 'text-[10px] uppercase tracking-[0.14em] text-gray-400 font-semibold';

  // Build Radarr/Sonarr link
  const arrLink = media.state?.record?.arrUrl
    ? {
        url:
          media.type === 'movie'
            ? linkService.radarr({ mediaId: media.state.record.id })
            : linkService.sonarr({ mediaId: media.state.record.id }),
        label: media.type === 'movie' ? 'Radarr' : 'Sonarr',
      }
    : null;

  // Build Jellyfin link
  const jellyfinLink = media.state?.record?.jellyfinId
    ? {
        url: linkService.jellyfin({ mediaId: media.state.record.id }),
        label: 'Jellyfin',
      }
    : null;

  const actionLinks = [
    trailerUrl ? { key: 'trailer', url: trailerUrl, label: 'Trailer' } : null,
    media.homepage ? { key: 'website', url: media.homepage, label: 'Website' } : null,
    arrLink ? { key: arrLink.label.toLowerCase(), url: arrLink.url, label: arrLink.label } : null,
    jellyfinLink ? { key: 'jellyfin', url: jellyfinLink.url, label: jellyfinLink.label } : null,
  ].filter((link): link is { key: string; url: string; label: string } => !!link);

  return (
    <div className="relative min-h-screen bg-gray-900">
      {/* Full-page backdrop background */}
      {backdropUrl && (
        <div className="fixed inset-0 z-0">
          <img
            src={backdropUrl}
            alt=""
            className="w-full h-full object-cover"
            style={{ objectPosition: 'center 30%' }}
          />
          {/* Gradient overlays for readability */}
          <div className="absolute inset-0 bg-linear-to-b from-gray-900/70 via-gray-900/90 to-gray-900" />
          <div className="absolute inset-0 bg-linear-to-r from-gray-900/95 via-gray-900/60 to-transparent" />
        </div>
      )}

      {/* Content container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-16 pb-28">
        {/* Main content grid: poster left, details right */}
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 mb-12">
          {/* Poster */}
          {posterUrl && (
            <div className="shrink-0">
              <img
                src={posterUrl}
                alt={title}
                className="w-full max-w-xs mx-auto md:mx-0 md:w-56 lg:w-80 xl:w-96 rounded-lg shadow-2xl"
              />
            </div>
          )}

          {/* Details */}
          <div className="flex-1 min-w-0">
            {/* Title and tagline */}
            <div className="mb-6">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 drop-shadow-lg">
                {title}
              </h1>
              {media.type === 'movie' && media.tagline && (
                <p className="text-xl md:text-2xl italic text-gray-300 drop-shadow-md">
                  "{media.tagline}"
                </p>
              )}
              {media.type === 'tv' && media.originalName !== media.name && (
                <p className="text-xl md:text-2xl italic text-gray-300 drop-shadow-md">
                  {media.originalName}
                </p>
              )}
            </div>

            {actionLinks.length > 0 && (
              <div className=" border-gray-700/50">
                <div className="flex flex-wrap gap-0 bg-white/5 rounded-md overflow-hidden items-center">
                  <div className="flex gap-0">
                    {actionLinks.map((link, index) => (
                      <div key={link.key} className="contents">
                        {index > 0 && <div className="w-px bg-white/10" />}
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-white px-4 py-2 hover:bg-white/10 transition-colors duration-200 no-underline font-medium"
                        >
                          {link.key === 'trailer' ? (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                            </svg>
                          ) : link.key === 'website' ? (
                            <svg
                              className="w-4 h-4"
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
                              className="w-4 h-4"
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
                      <div className="w-px bg-white/10 ml-auto" />
                      <div className="flex items-center px-4 py-2">
                        <StatusBadge status={availabilityStatus} size="sm" />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Quick info panel */}
            <div className="mb-6 mt-2 pt-2">
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
                <div
                  className={`${infoTileClass} ${
                    media.type === 'movie'
                      ? 'bg-rose-600/20 border-rose-400/40'
                      : 'bg-sky-600/20 border-sky-400/40'
                  }`}
                >
                  <p className={infoLabelClass}>Media Type</p>
                  <div className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-white">
                    {media.type === 'movie' ? (
                      <svg
                        className="w-4 h-4 text-rose-200"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM4 9h12v-2H4v2z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-sky-200" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                      </svg>
                    )}
                    <span>{media.type === 'movie' ? 'Movie' : 'TV Series'}</span>
                  </div>
                </div>

                <div className={infoTileClass}>
                  <p className={infoLabelClass}>Rating</p>
                  <div className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-white">
                    <svg className="w-4 h-4 text-amber-300" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span>{media.voteAverage.toFixed(1)}</span>
                    <span className="text-xs font-medium text-gray-400">
                      ({media.voteCount.toLocaleString()})
                    </span>
                  </div>
                </div>

                {releaseDate && (
                  <div className={infoTileClass}>
                    <p className={infoLabelClass}>Release Date</p>
                    <div className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-gray-100">
                      <svg
                        className="w-4 h-4 text-gray-400"
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
                        className="w-4 h-4 text-gray-400"
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
                  <p className="mt-1.5 text-sm font-semibold text-gray-100 truncate">
                    {media.status}
                  </p>
                </div>
              </div>

              {media.genres && media.genres.length > 0 && (
                <div className="mt-2 pt-2">
                  <div className="flex flex-wrap gap-2">
                    {media.genres.map(genre => (
                      <span
                        key={genre.id}
                        className="inline-flex items-center rounded-md bg-gray-800/65 text-gray-200 px-2.5 py-1 text-xs border border-gray-700/70"
                      >
                        {genre.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Overview */}
            {media.overview && (
              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-white mb-3 drop-shadow-md">Overview</h2>
                <p className="text-gray-200 text-lg leading-relaxed drop-shadow-sm">
                  {media.overview}
                </p>
              </div>
            )}

            {/* Cast section - Responsive grid */}
            {topCast.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-white mb-4 drop-shadow-md">Cast</h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                  {topCast.map(actor => (
                    <div key={actor.id} className="flex flex-col items-center">
                      {actor.profilePath ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w185${actor.profilePath}`}
                          alt={actor.name}
                          className="w-20 h-20 rounded-full object-cover shadow-lg border-2 border-gray-700/50 mb-2"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-gray-700/50 flex items-center justify-center shadow-lg border-2 border-gray-700/50 mb-2">
                          <svg
                            className="w-10 h-10 text-gray-500"
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
                      <div className="text-center w-full">
                        <p className="text-white font-medium text-xs truncate">{actor.name}</p>
                        <p className="text-gray-400 text-2xs truncate">{actor.character}</p>
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
                <h3 className="text-xl font-semibold text-white mb-3 drop-shadow-md">Keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {media.keywords.map(keyword => (
                    <span
                      key={keyword.id}
                      className="bg-blue-600/20 backdrop-blur-sm text-blue-200 px-3 py-1 rounded-full text-sm border border-blue-500/40 shadow-md"
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
      <div className="fixed bottom-0 md:bottom-0 left-0 md:left-64 right-0 z-60 md:z-30 bg-gray-900/95 backdrop-blur-md border-t border-gray-800 shadow-2xl mb-16 md:mb-0">
        <div className="w-full px-4 py-4">
          <div className="flex justify-center">
            <LikeDislikeButton
              tmdbId={localMedia.tmdbId}
              mediaType={localMedia.type}
              initialAction={
                localMedia.state?.interactions?.find(i => i.action === 'liked')
                  ? 'liked'
                  : localMedia.state?.interactions?.find(i => i.action === 'disliked')
                    ? 'disliked'
                    : null
              }
              existingMedia={localMedia}
              onUpdate={(updatedMedia: Media) => {
                setLocalMedia(updatedMedia as MovieDetails | TVDetails);
                onVoteComplete?.();
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
