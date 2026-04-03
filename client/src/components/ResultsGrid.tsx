import React from 'react';
import type { Media } from '../../../shared/dist/types';
import { LikeDislikeButton } from './LikeDislikeButton';

interface ResultsGridProps {
  results: Media[];
  onSelectItem: (item: Media) => void;
  onUpdateItem?: (updatedItem: Media) => void;
}

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

export const ResultsGrid: React.FC<ResultsGridProps> = ({
  results,
  onSelectItem,
  onUpdateItem,
}) => {
  if (results.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="flex flex-col items-center gap-4">
          <svg
            className="w-16 h-16 text-gray-600"
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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
      {results.map(item => {
        const title = item.name;
        const releaseDate = item.date;
        const year = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';
        const posterPath = item.posterPath;

        const isLiked = item.state?.interactions?.find(i => i.action === 'liked');
        const isDisliked = item.state?.interactions?.find(i => i.action === 'disliked');
        const hasInteraction = isLiked || isDisliked;

        return (
          <div
            key={item.tmdbId}
            onClick={() => onSelectItem(item)}
            className="group cursor-pointer transition-all duration-300"
          >
            {/* Poster with text overlay */}
            <div className="relative overflow-hidden shadow-lg bg-gray-900/40 backdrop-blur-sm border border-gray-700/50 group-hover:border-amber-500 transition-all duration-300 group-hover:shadow-xl rounded-lg">
              {/* Trending Badge */}
              {item.trendingRank && (
                <div className="absolute top-1.5 md:top-3 right-1.5 md:right-3 bg-linear-to-r from-amber-500 to-orange-500 text-white px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md text-xs font-bold shadow-lg z-10">
                  #{item.trendingRank}
                </div>
              )}

              {/* Status Badges */}
              {item.state?.record?.status === 'available' && (
                <div className="absolute top-1.5 md:top-3 left-1.5 md:left-3 bg-green-600 text-white px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md text-xs font-bold shadow-lg z-10 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Available
                </div>
              )}
              {item.state?.record?.status === 'downloaded' && (
                <div className="absolute top-1.5 md:top-3 left-1.5 md:left-3 bg-emerald-600 text-white px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md text-xs font-bold shadow-lg z-10 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Downloaded
                </div>
              )}
              {item.state?.record?.status === 'downloading' && (
                <div className="absolute top-1.5 md:top-3 left-1.5 md:left-3 bg-blue-600 text-white px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md text-xs font-bold shadow-lg z-10 flex items-center gap-1">
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Downloading
                </div>
              )}
              {item.state?.record?.status === 'requested' && (
                <div className="absolute top-1.5 md:top-3 left-1.5 md:left-3 bg-yellow-600 text-white px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md text-xs font-bold shadow-lg z-10 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Requested
                </div>
              )}

              {posterPath ? (
                <>
                  <img
                    src={`${TMDB_IMAGE_BASE}${posterPath}`}
                    alt={title}
                    className={`w-full aspect-2/3 object-cover transition-all duration-300 group-hover:scale-105 ${
                      hasInteraction ? 'opacity-30' : ''
                    }`}
                  />
                  {/* Interaction overlay */}
                  {isLiked && (
                    <div className="absolute inset-0 bg-green-500/10 border-2 border-green-400 pointer-events-none" />
                  )}
                  {isDisliked && (
                    <div className="absolute inset-0 bg-red-500/10 border-2 border-red-400 pointer-events-none" />
                  )}
                </>
              ) : (
                <div className="w-full aspect-2/3 bg-gray-700 flex items-center justify-center text-gray-500">
                  <span className="text-sm">No Poster</span>
                </div>
              )}

              {/* Glassmorphism overlay at bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-2 md:p-4 z-10 bg-linear-to-t from-black/20 via-black/20 to-transparent backdrop-blur-md">
                <h3 className="text-white font-bold text-sm md:text-base leading-tight mb-1 md:mb-2 line-clamp-2 group-hover:text-amber-400 transition-colors drop-shadow-lg">
                  {title}
                </h3>

                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-200 text-xs md:text-sm font-medium drop-shadow">
                    {year}
                  </span>

                  <div className="flex items-center gap-1 md:gap-1.5 bg-black/60 backdrop-blur-sm px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md">
                    <span className="text-yellow-400 text-xs md:text-sm">★</span>
                    <span className="text-white text-xs md:text-sm font-semibold">
                      {item.voteAverage.toFixed(1)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 md:gap-1.5 bg-black/60 backdrop-blur-sm px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md">
                    <span className="text-yellow-400 text-xs md:text-sm">★</span>
                    <span className="text-white text-xs md:text-sm font-semibold">
                      {item.state?.score?.keywordScore?.toFixed(2)}-
                      {item.state?.score?.genreScore?.toFixed(2)} =
                      {item.state?.score?.finalScore?.toFixed(1)}
                      {/* {item.state?.score?.popularityScore?.toFixed(1)}
                      {item.state?.score?.recencyScore.toFixed(1)}
                      {item.state?.score?.trendingScore?.toFixed(1)}
                      {item.state?.score?.weightedRating?.toFixed(1)} */}
                    </span>
                  </div>
                </div>

                {/* Like/Dislike Buttons */}
                <div className="flex justify-center" onClick={e => e.stopPropagation()}>
                  <LikeDislikeButton
                    tmdbId={item.tmdbId}
                    mediaType={item.type}
                    initialAction={isLiked ? 'liked' : isDisliked ? 'disliked' : null}
                    {...(onUpdateItem && { onUpdate: onUpdateItem })}
                    compact
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
