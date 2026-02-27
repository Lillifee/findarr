import type { RequestStatus, Media } from '@findarr/shared';
import { useState, useEffect } from 'react';
import { requestService } from '../services/api';

const statusStyles: Record<RequestStatus, string> = {
  pending: 'bg-yellow-600/80 text-yellow-100',
  approved: 'bg-green-600/80 text-green-100',
  rejected: 'bg-red-600/80 text-red-100',
  available: 'bg-cyan-600/80 text-cyan-100',
};

const statusLabels: Record<RequestStatus, string> = {
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  available: 'Available to Watch',
};

function getStatusIcon(status: RequestStatus): React.ReactElement {
  switch (status) {
    case 'pending': {
      return (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    }
    case 'approved': {
      return (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    }
    case 'rejected': {
      return (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      );
    }
    case 'available': {
      return (
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
      );
    }
  }
}

export function MyRequests() {
  const [requests, setRequests] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    try {
      const requests = await requestService.getUserRequests();
      setRequests(requests);
    } catch {
      console.error('Failed to load requests');
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-5 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading your requests...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-5">
      <h2 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6">My Requests</h2>

      {requests.length === 0 ? (
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
            <p>You haven't requested any media yet.</p>
            <p className="text-sm text-gray-500">Browse and click "Request" to add items!</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-5 mt-5">
          {requests.map(request => (
            <div
              key={`${request.id}-${request.type}`}
              className="border border-gray-700/50 rounded-lg overflow-hidden bg-gray-900/40 backdrop-blur-sm shadow-lg hover:border-amber-500 hover:shadow-xl transition-all duration-300 cursor-pointer"
            >
              {request.posterPath && (
                <img
                  src={`https://image.tmdb.org/t/p/w300${request.posterPath}`}
                  alt={request.name}
                  className="w-full h-75 object-cover"
                />
              )}
              <div className="p-3 md:p-4">
                <h3 className="m-0 mb-2 md:mb-2.5 text-sm md:text-base font-semibold text-white line-clamp-2">
                  {request.name}
                </h3>
                <div className="mb-2 md:mb-2.5 text-xs md:text-sm text-gray-400 capitalize">
                  {request.type}
                </div>
                <div
                  className={`flex items-center justify-center gap-1.5 px-2 md:px-2.5 py-1 md:py-1.5 rounded-full text-xs text-center mb-2 md:mb-2.5 font-medium ${statusStyles[request.state?.record?.status || 'pending']}`}
                >
                  {getStatusIcon(request.state?.record?.status || 'pending')}
                  <span>{statusLabels[request.state?.record?.status || 'pending']}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
