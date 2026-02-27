import type { RequestStatus, Media } from '@findarr/shared';
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
  const [requests, setRequests] = useState<Media[]>([]);
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

  const filteredRequests =
    filter === 'all' ? requests : requests.filter(r => r.state?.record?.status === filter);

  return (
    <div className="p-4 md:p-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 md:mb-5">
        <h2 className="m-0 text-white text-xl md:text-2xl">Request Management</h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="mr-2 text-gray-300 text-sm md:text-base">Filter:</label>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as RequestStatus | 'all')}
            className="flex-1 sm:flex-initial px-2 py-2 border border-gray-600 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
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
        <p className="text-center text-gray-400 py-10">No requests found</p>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-800">
                  <th className="p-3 text-left border-b-2 border-gray-700 text-gray-300">Title</th>
                  <th className="p-3 text-left border-b-2 border-gray-700 text-gray-300">Type</th>
                  <th className="p-3 text-left border-b-2 border-gray-700 text-gray-300">
                    Requested By
                  </th>
                  <th className="p-3 text-left border-b-2 border-gray-700 text-gray-300">Status</th>
                  <th className="p-3 text-left border-b-2 border-gray-700 text-gray-300">
                    Requested
                  </th>
                  <th className="p-3 text-left border-b-2 border-gray-700 text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map(request => {
                  const status = request.state?.record?.status || 'pending';
                  const dbId = request.state?.record?.id || 0;
                  const userInfo = request.state?.allInteractions?.[0];

                  return (
                    <tr key={`${request.id}-${request.type}`} className="border-b border-gray-700">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {request.posterPath && (
                            <img
                              src={`https://image.tmdb.org/t/p/w92${request.posterPath}`}
                              alt={request.name}
                              className="w-10 h-15 object-cover rounded"
                            />
                          )}
                          <span className="text-gray-300">{request.name}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="capitalize text-gray-300">{request.type}</span>
                      </td>
                      <td className="p-3">
                        <div>
                          <div className="text-gray-300">
                            {userInfo?.userDisplayName || 'Unknown'}
                          </div>
                          <div className="text-xs text-gray-500">{userInfo?.userEmail || ''}</div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          style={{
                            backgroundColor: statusColors[status],
                          }}
                          className="px-2 py-1 rounded text-white text-xs"
                        >
                          {statusLabels[status]}
                        </span>
                      </td>

                      <td className="p-3">
                        <div className="flex gap-1 flex-wrap">
                          {status !== 'approved' && (
                            <button
                              onClick={() => updateStatus(dbId, 'approved')}
                              className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors cursor-pointer text-xs"
                            >
                              Approve
                            </button>
                          )}
                          {status !== 'rejected' && (
                            <button
                              onClick={() => updateStatus(dbId, 'rejected')}
                              className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors cursor-pointer text-xs"
                            >
                              Reject
                            </button>
                          )}
                          {status === 'approved' && (
                            <button
                              onClick={() => updateStatus(dbId, 'available')}
                              className="px-2 py-1 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition-colors cursor-pointer text-xs"
                            >
                              Mark Available
                            </button>
                          )}
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
            {filteredRequests.map(request => {
              const status = request.state?.record?.status || 'pending';
              const dbId = request.state?.record?.id || 0;
              const userInfo = request.state?.allInteractions?.[0];

              return (
                <div
                  key={`${request.id}-${request.type}`}
                  className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3"
                >
                  <div className="flex gap-3">
                    {request.posterPath && (
                      <img
                        src={`https://image.tmdb.org/t/p/w92${request.posterPath}`}
                        alt={request.name}
                        className="w-12 h-18 object-cover rounded shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-sm mb-1 line-clamp-2">
                        {request.name}
                      </h3>
                      <div className="text-xs text-gray-400 capitalize">{request.type}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        backgroundColor: statusColors[status],
                      }}
                      className="px-2 py-1 rounded text-white text-xs font-medium"
                    >
                      {statusLabels[status]}
                    </span>
                  </div>

                  <div className="text-xs text-gray-300">
                    <div className="font-medium">{userInfo?.userDisplayName || 'Unknown'}</div>
                    <div className="text-gray-500">{userInfo?.userEmail || ''}</div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {status !== 'approved' && (
                      <button
                        onClick={() => updateStatus(dbId, 'approved')}
                        className="flex-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors cursor-pointer text-xs font-medium"
                      >
                        Approve
                      </button>
                    )}
                    {status !== 'rejected' && (
                      <button
                        onClick={() => updateStatus(dbId, 'rejected')}
                        className="flex-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors cursor-pointer text-xs font-medium"
                      >
                        Reject
                      </button>
                    )}
                    {status === 'approved' && (
                      <button
                        onClick={() => updateStatus(dbId, 'available')}
                        className="w-full px-3 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition-colors cursor-pointer text-xs font-medium"
                      >
                        Mark Available
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
