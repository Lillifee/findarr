import React from 'react';
import type { Media } from '../../../shared/dist/types';
import { LikeDislikeButton } from './LikeDislikeButton';

interface ResultsGridProps {
  results: Media[];
  onSelectItem: (item: Media) => void;
}

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

export const ResultsGrid: React.FC<ResultsGridProps> = ({ results, onSelectItem }) => {
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

        return (
          <div
            key={item.id}
            onClick={() => onSelectItem(item)}
            className="group cursor-pointer transition-all duration-300"
          >
            {/* Poster with text overlay */}
            <div className="relative overflow-hidden shadow-lg bg-gray-900/40 backdrop-blur-sm border border-gray-700/50 group-hover:border-amber-500 transition-all duration-300 group-hover:shadow-xl rounded-lg">
              {/* Trending Badge */}
              {item.state?.trendingRank && (
                <div className="absolute top-1.5 md:top-3 right-1.5 md:right-3 bg-linear-to-r from-amber-500 to-orange-500 text-white px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md text-xs font-bold shadow-lg z-10">
                  #{item.state.trendingRank}
                </div>
              )}

              {item.state?.record?.status === 'available' && (
                <div className="absolute top-1.5 md:top-3 right-1.5 md:right-3 bg-linear-to-r from-amber-500 to-orange-500 text-white px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md text-xs font-bold shadow-lg z-10">
                  AVAILABLE
                </div>
              )}

              {posterPath ? (
                <img
                  src={`${TMDB_IMAGE_BASE}${posterPath}`}
                  alt={title}
                  className="w-full aspect-2/3 object-cover transition-transform duration-300 group-hover:scale-105"
                />
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
                </div>

                {/* Like/Dislike Buttons */}
                <div className="flex justify-center" onClick={e => e.stopPropagation()}>
                  <LikeDislikeButton
                    tmdbId={item.id}
                    mediaType={item.type}
                    initialAction={
                      item.state?.interactions?.find(i => i.action === 'liked')
                        ? 'liked'
                        : item.state?.interactions?.find(i => i.action === 'disliked')
                          ? 'disliked'
                          : null
                    }
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
