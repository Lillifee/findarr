import type { MovieDetails, TVDetails } from '@findarr/shared';
import { LikeDislikeButton } from './LikeDislikeButton';

interface MediaDetailsProps {
  media: MovieDetails | TVDetails;
}

export function MediaView({ media }: MediaDetailsProps) {
  // Common data extraction
  const title = media.name;
  const releaseDate = media.date;

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

  const formatBudget = (amount: number) => {
    if (amount === 0) return 'Unknown';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <>
      {/* Backdrop Banner - Both Mobile & Desktop */}
      {media.backdropPath && (
        <div className="relative w-full h-64 md:h-96 overflow-hidden">
          <img
            src={`https://image.tmdb.org/t/p/original${media.backdropPath}`}
            alt={title}
            className="w-full h-full object-cover"
          />
          {/* Gradient overlay - stronger on mobile, softer on desktop */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-900/60 to-gray-900" />

          {/* Title overlay on backdrop for desktop - positioned higher to be above the card */}
          <div className="hidden md:block absolute top-1/2 left-0 right-0">
            <div className="max-w-6xl mx-auto px-8">
              <h1 className="m-0 text-5xl font-bold text-white drop-shadow-2xl">{title}</h1>
              {media.type === 'movie' && media.tagline && (
                <p className="italic text-gray-200 mt-2 text-xl drop-shadow-lg">
                  "{media.tagline}"
                </p>
              )}
              {media.type === 'tv' && media.originalName !== media.name && (
                <p className="italic text-gray-200 mt-2 text-xl drop-shadow-lg">
                  Original: {media.originalName}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content Container - Overlaps backdrop slightly */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-8 -mt-16 md:-mt-20">
        {/* Content card with background for readability where it overlaps */}
        <div className="bg-gradient-to-b from-gray-900/95 to-gray-900 rounded-t-2xl md:rounded-t-3xl shadow-2xl p-4 md:p-8 pt-6 md:pt-10">
          {/* Title - Only show on mobile (on desktop it's in the backdrop) */}
          <h1 className="md:hidden m-0 mb-2 text-2xl font-bold text-white">{title}</h1>

          {/* Movie tagline or TV original name - Mobile only */}
          {media.type === 'movie' && media.tagline && (
            <p className="md:hidden italic text-gray-400 mb-4 text-lg">"{media.tagline}"</p>
          )}

          {media.type === 'tv' && media.originalName !== media.name && (
            <p className="md:hidden italic text-gray-400 mb-4 text-lg">
              Original: {media.originalName}
            </p>
          )}

          {/* Common stats row */}
          <div className="flex flex-wrap gap-3 md:gap-6 mb-4 md:mb-6 text-xs md:text-sm text-gray-300">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {media.voteAverage.toFixed(1)} ({media.voteCount.toLocaleString()} votes)
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {releaseDate}
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {formatRuntime(media.type === 'movie' ? media.runtime : media.episodeRunTime)}
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {media.status}
            </span>
          </div>

          {/* TV-specific additional stats */}
          {media.type === 'tv' && (
            <div className="flex flex-wrap gap-3 md:gap-6 mb-4 md:mb-6 text-xs md:text-sm text-gray-300">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                {media.type.toUpperCase()}
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                {media.numberOfSeasons} Season{media.numberOfSeasons === 1 ? '' : 's'}
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                  />
                </svg>
                {media.numberOfEpisodes} Episode{media.numberOfEpisodes === 1 ? '' : 's'}
              </span>
            </div>
          )}

          {/* Genres */}
          {media.genres && media.genres.length > 0 && (
            <div className="mb-4 md:mb-6">
              <h3 className="m-0 mb-2 text-base md:text-lg font-semibold text-white">Genres</h3>
              <div className="flex flex-wrap gap-2">
                {media.genres.map(genre => (
                  <span
                    key={genre.id}
                    className="bg-amber-600/20 backdrop-blur-sm text-amber-200 px-2 md:px-3 py-1 rounded-full text-xs md:text-sm border border-amber-500/40 shadow-md"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Keywords */}
          {media.keywords && media.keywords.length > 0 && (
            <div className="mb-4 md:mb-6">
              <h3 className="m-0 mb-2 text-base md:text-lg font-semibold text-white">Keywords</h3>
              <div className="flex flex-wrap gap-2">
                {media.keywords.map(keyword => (
                  <span
                    key={keyword.id}
                    className="bg-blue-600/20 backdrop-blur-sm text-blue-200 px-2 md:px-3 py-1 rounded-full text-xs md:text-sm border border-blue-500/40 shadow-md"
                  >
                    {keyword.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* TV-specific origin countries */}
          {media.type === 'tv' && media.originCountry && media.originCountry.length > 0 && (
            <div className="mb-4 md:mb-6">
              <h3 className="m-0 mb-2 text-base md:text-lg font-semibold text-white">
                Origin Country
              </h3>
              <div className="flex flex-wrap gap-2">
                {media.originCountry.map((country, index) => (
                  <span
                    key={index}
                    className="bg-yellow-600/30 text-yellow-200 px-2 md:px-3 py-1 rounded-full text-xs md:text-sm border border-yellow-500/50"
                  >
                    {country}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Overview */}
          {media.overview && (
            <div className="mb-6 md:mb-8">
              <h3 className="m-0 mb-2 md:mb-3 text-base md:text-lg font-semibold text-white">
                Overview
              </h3>
              <p className="leading-relaxed text-gray-300 text-sm md:text-base">{media.overview}</p>
            </div>
          )}

          {/* Info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 md:mb-8 p-3 md:p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
            {media.type === 'movie' && (
              <>
                <div className="text-gray-300 text-sm md:text-base">
                  <strong className="text-white">Budget:</strong>
                  <br />
                  {formatBudget(media.budget)}
                </div>
                <div className="text-gray-300 text-sm md:text-base">
                  <strong className="text-white">Revenue:</strong>
                  <br />
                  {formatBudget(media.revenue)}
                </div>
              </>
            )}

            {media.type === 'tv' && (
              <>
                <div className="text-gray-300 text-sm md:text-base">
                  <strong className="text-white">Show Type:</strong>
                  <br />
                  {media.showType}
                </div>
                <div className="text-gray-300 text-sm md:text-base">
                  <strong className="text-white">Popularity:</strong>
                  <br />
                  {media.popularity.toFixed(1)}
                </div>
              </>
            )}

            <div className="text-gray-300 text-sm md:text-base">
              <strong className="text-white">Original Language:</strong>
              <br />
              {media.originalLanguage?.toUpperCase()}
            </div>

            {media.type === 'movie' && media.imdbId && (
              <div className="text-gray-300 text-sm md:text-base">
                <strong className="text-white">IMDB:</strong>
                <br />
                <a
                  href={`https://www.imdb.com/title/${media.imdbId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:text-amber-300 no-underline transition-colors"
                >
                  View on IMDB →
                </a>
              </div>
            )}
          </div>

          {/* Homepage link */}
          {media.homepage && (
            <div className="mb-6 md:mb-8">
              <a
                href={media.homepage}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 no-underline text-xs md:text-sm transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                  />
                </svg>
                <span>Official Website</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>
          )}

          {/* Like/Dislike buttons */}
          <div className="flex justify-center md:justify-start">
            <LikeDislikeButton
              tmdbId={media.tmdbId}
              mediaType={media.type}
              initialAction={
                media.state?.interactions?.find(i => i.action === 'liked')
                  ? 'liked'
                  : media.state?.interactions?.find(i => i.action === 'disliked')
                    ? 'disliked'
                    : null
              }
            />
          </div>
        </div>
      </div>
    </>
  );
}
