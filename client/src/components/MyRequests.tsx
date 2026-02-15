import type { RequestStatus, MediaRequest } from '@findarr/shared';
import { useState, useEffect } from 'react';
import { requestService } from '../services/api';

const statusColors: Record<RequestStatus, string> = {
  pending: '#ffc107',
  approved: '#28a745',
  rejected: '#dc3545',
  available: '#17a2b8',
};

const statusLabels: Record<RequestStatus, string> = {
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  available: 'Available to Watch',
};

export function MyRequests() {
  const [requests, setRequests] = useState<MediaRequest[]>([]);
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
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading your requests...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>My Requests</h2>

      {requests.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
          You haven't requested any media yet. Browse and click "Request" to add items!
        </p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '20px',
            marginTop: '20px',
          }}
        >
          {requests.map(request => (
            <div
              key={request.id}
              style={{
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: 'white',
              }}
            >
              {request.posterPath && (
                <img
                  src={`https://image.tmdb.org/t/p/w300${request.posterPath}`}
                  alt={request.title}
                  style={{ width: '100%', height: '300px', objectFit: 'cover' }}
                />
              )}
              <div style={{ padding: '15px' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>{request.title}</h3>
                <div
                  style={{
                    marginBottom: '10px',
                    fontSize: '14px',
                    color: '#666',
                    textTransform: 'capitalize',
                  }}
                >
                  {request.mediaType}
                </div>
                <div
                  style={{
                    padding: '6px 10px',
                    borderRadius: '4px',
                    backgroundColor: statusColors[request.status],
                    color: 'white',
                    fontSize: '12px',
                    textAlign: 'center',
                    marginBottom: '10px',
                  }}
                >
                  {statusLabels[request.status]}
                </div>
                <div style={{ fontSize: '12px', color: '#999' }}>
                  Requested {new Date(request.requestedAt * 1000).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
