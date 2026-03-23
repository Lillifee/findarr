import type { Media } from '@findarr/shared';
import { useState, useEffect } from 'react';
import { interactionService } from '../services/api';
import { LikeDislikeButton } from './LikeDislikeButton';

export function MyLikes() {
  const [likedMedia, setLikedMedia] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLikedMedia();
  }, []);

  async function loadLikedMedia() {
    try {
      const media = await interactionService.listLiked();
      setLikedMedia(media);
    } catch {
      console.error('Failed to load voted media');
    } finally {
      setIsLoading(false);
    }
  }

  const handleToggle = (tmdbId: number, action: 'liked' | 'disliked' | null) => {
    if (action === null) {
      // Remove from list if vote is removed
      setLikedMedia(prev => prev.filter(m => m.tmdbId !== tmdbId));
    }
  };

  if (isLoading) {
    return (
      <div className="p-5 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading your votes...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-5">
      <h2 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6">My Votes</h2>

      {likedMedia.length === 0 ? (
        <div className="text-center text-gray-400 py-10">
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
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <p>You haven't voted on any media yet.</p>
            <p className="text-sm text-gray-500">
              Browse and use the like/dislike buttons to vote on media!
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-5 mt-5">
          {likedMedia.map(media => (
            <div
              key={`${media.tmdbId}-${media.type}`}
              className="border border-gray-700/50 rounded-lg overflow-hidden bg-gray-900/40 backdrop-blur-sm shadow-lg hover:border-amber-500 hover:shadow-xl transition-all duration-300"
            >
              {media.posterPath && (
                <img
                  src={`https://image.tmdb.org/t/p/w300${media.posterPath}`}
                  alt={media.name}
                  className="w-full h-75 object-cover"
                />
              )}
              <div className="p-3 md:p-4">
                <h3 className="m-0 mb-2 md:mb-2.5 text-sm md:text-base font-semibold text-white line-clamp-2">
                  {media.name}
                </h3>
                <div className="mb-2 md:mb-2.5 text-xs md:text-sm text-gray-400 capitalize">
                  {media.type}
                </div>

                {/* Status Badge */}
                {media.state?.record?.status === 'requested' && (
                  <div className="flex items-center justify-center gap-1.5 px-2 md:px-2.5 py-1 md:py-1.5 rounded-full text-xs text-center mb-2 md:mb-2.5 font-medium bg-yellow-600/80 text-yellow-100">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>Requested</span>
                  </div>
                )}

                {media.state?.record?.status === 'available' && (
                  <div className="flex items-center justify-center gap-1.5 px-2 md:px-2.5 py-1 md:py-1.5 rounded-full text-xs text-center mb-2 md:mb-2.5 font-medium bg-cyan-600/80 text-cyan-100">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>Available</span>
                  </div>
                )}

                {/* Like/Dislike Controls */}
                <div className="flex justify-center">
                  <LikeDislikeButton
                    tmdbId={media.tmdbId}
                    mediaType={media.type}
                    initialAction={media.state?.interactions?.[0]?.action ?? null}
                    onUpdate={updatedMedia => {
                      const action =
                        updatedMedia.state?.interactions?.find(i => i.action)?.action ?? null;
                      handleToggle(media.tmdbId, action);
                    }}
                    compact
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
