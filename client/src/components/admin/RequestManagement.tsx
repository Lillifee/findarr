import type { RequestStatus, MediaRequestWithUser } from '@findarr/shared';
import { useState, useEffect } from 'react';
import { adminRequestService } from '../../services/api';

const statusColors: Record<RequestStatus, string> = {
  pending: '#ffc107',
  approved: '#28a745',
  rejected: '#dc3545',
  available: '#17a2b8',
};

const statusLabels: Record<RequestStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  available: 'Available',
};

export function RequestManagement() {
  const [requests, setRequests] = useState<MediaRequestWithUser[]>([]);
  const [filter, setFilter] = useState<RequestStatus | 'all'>('all');

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    try {
      const requests = await adminRequestService.listAllRequests();
      setRequests(requests);
    } catch (error) {
      console.error('Failed to load requests:', error);
    }
  }

  async function updateStatus(requestId: number, status: RequestStatus) {
    try {
      await adminRequestService.updateRequestStatus(requestId, status);
      await loadRequests();
    } catch (error) {
      console.error('Failed to load requests:', error);
      alert('Failed to update status');
    }
  }

  const filteredRequests = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  return (
    <div style={{ padding: '20px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <h2>Request Management</h2>
        <div>
          <label style={{ marginRight: '10px' }}>Filter:</label>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as RequestStatus | 'all')}
            style={{
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="available">Available</option>
          </select>
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>No requests found</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                Title
              </th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                Type
              </th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                Requested By
              </th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                Status
              </th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                Requested
              </th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.map(request => (
              <tr key={request.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {request.poster_path && (
                      <img
                        src={`https://image.tmdb.org/t/p/w92${request.poster_path}`}
                        alt={request.title}
                        style={{
                          width: '40px',
                          height: '60px',
                          objectFit: 'cover',
                          borderRadius: '4px',
                        }}
                      />
                    )}
                    <span>{request.title}</span>
                  </div>
                </td>
                <td style={{ padding: '12px' }}>
                  <span style={{ textTransform: 'capitalize' }}>{request.media_type}</span>
                </td>
                <td style={{ padding: '12px' }}>
                  <div>
                    <div>{request.user_display_name}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{request.user_email}</div>
                  </div>
                </td>
                <td style={{ padding: '12px' }}>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      backgroundColor: statusColors[request.status],
                      color: 'white',
                      fontSize: '12px',
                    }}
                  >
                    {statusLabels[request.status]}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>
                  {new Date(request.requested_at * 1000).toLocaleDateString()}
                </td>
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {request.status !== 'approved' && (
                      <button
                        onClick={() => updateStatus(request.id, 'approved')}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        Approve
                      </button>
                    )}
                    {request.status !== 'rejected' && (
                      <button
                        onClick={() => updateStatus(request.id, 'rejected')}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        Reject
                      </button>
                    )}
                    {request.status === 'approved' && (
                      <button
                        onClick={() => updateStatus(request.id, 'available')}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#17a2b8',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        Mark Available
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
