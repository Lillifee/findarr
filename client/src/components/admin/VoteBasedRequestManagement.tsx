import type { Media } from '@findarr/shared';
import { useState, useEffect } from 'react';
import { adminInteractionService } from '../../services/api';

export function VoteBasedRequestManagement() {
  const [requestedMedia, setRequestedMedia] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRequestedMedia();
  }, []);

  async function loadRequestedMedia() {
    try {
      const media = await adminInteractionService.listAll();
      setRequestedMedia(media);
    } catch (error) {
      console.error('Failed to load media:', error);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-5 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading media...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-5">
      <div className="mb-4 md:mb-6">
        <h2 className="m-0 text-white text-xl md:text-2xl mb-2">Manage Requests</h2>
        <p className="text-gray-400 text-sm">
          All media with user votes - automatically requested when threshold is reached
        </p>
      </div>

      {requestedMedia.length === 0 ? (
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p>No voted media yet</p>
            <p className="text-sm text-gray-500">Media will appear here when users start voting</p>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-800">
                  <th className="p-3 text-left border-b-2 border-gray-700 text-gray-300">Title</th>
                  <th className="p-3 text-left border-b-2 border-gray-700 text-gray-300">Type</th>
                  <th className="p-3 text-left border-b-2 border-gray-700 text-gray-300">Status</th>
                  <th className="p-3 text-left border-b-2 border-gray-700 text-gray-300">
                    Votes (👍/👎)
                  </th>
                </tr>
              </thead>
              <tbody>
                {requestedMedia.map(media => {
                  const likes = media.state?.votes?.likes || 0;
                  const dislikes = media.state?.votes?.dislikes || 0;
                  const status = media.state?.record?.status || 'pending';
                  return (
                    <tr key={`${media.id}-${media.type}`} className="border-b border-gray-700">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {media.posterPath && (
                            <img
                              src={`https://image.tmdb.org/t/p/w92${media.posterPath}`}
                              alt={media.name}
                              className="w-10 h-15 object-cover rounded"
                            />
                          )}
                          <span className="text-gray-300">{media.name}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="capitalize text-gray-300">{media.type}</span>
                      </td>
                      <td className="p-3">
                        {status === 'pending' && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-600/80 text-gray-200">
                            Pending
                          </span>
                        )}
                        {status === 'requested' && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-600/80 text-yellow-100">
                            Requested
                          </span>
                        )}
                        {status === 'available' && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-600/80 text-cyan-100">
                            Available
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2 text-gray-300">
                          <span className="text-green-400">👍 {likes}</span>
                          <span className="text-gray-500">/</span>
                          <span className="text-red-400">👎 {dislikes}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {requestedMedia.map(media => {
              const likes = media.state?.votes?.likes || 0;
              const dislikes = media.state?.votes?.dislikes || 0;
              const interactionCount = media.state?.interactions?.length || 0;
              const status = media.state?.record?.status || 'pending';

              return (
                <div
                  key={`${media.id}-${media.type}`}
                  className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3"
                >
                  <div className="flex gap-3">
                    {media.posterPath && (
                      <img
                        src={`https://image.tmdb.org/t/p/w92${media.posterPath}`}
                        alt={media.name}
                        className="w-12 h-18 object-cover rounded shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-sm mb-1 line-clamp-2">
                        {media.name}
                      </h3>
                      <div className="text-xs text-gray-400 capitalize mb-2">{media.type}</div>
                      {status === 'pending' && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-600/80 text-gray-200">
                          Pending
                        </span>
                      )}
                      {status === 'requested' && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-600/80 text-yellow-100">
                          Requested
                        </span>
                      )}
                      {status === 'available' && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-600/80 text-cyan-100">
                          Available
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Vote Stats */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-green-400">👍 {likes}</span>
                      <span className="text-red-400">👎 {dislikes}</span>
                    </div>
                  </div>

                  <div className="text-xs text-gray-400">{interactionCount} interactions</div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
