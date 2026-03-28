import type { SchedulerState } from '@findarr/shared';
import { useState, useEffect } from 'react';
import { schedulerService, adminSchedulerService } from '../../services/api';

export function Schedulers() {
  const [schedulers, setSchedulers] = useState<SchedulerState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadSchedulers();
    // Refresh every 5 seconds
    const interval = setInterval(loadSchedulers, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadSchedulers() {
    try {
      const data = await schedulerService.listAll();
      setSchedulers(data);
      setError('');
    } catch {
      setError('Failed to load schedulers');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleTrigger(name: string) {
    setActionLoading(name);
    try {
      await adminSchedulerService.trigger(name);
      await loadSchedulers();
    } catch {
      alert('Failed to trigger scheduler');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleToggle(name: string, enabled: boolean) {
    setActionLoading(name);
    try {
      await (enabled ? adminSchedulerService.stop(name) : adminSchedulerService.start(name));
      await loadSchedulers();
    } catch {
      alert('Failed to toggle scheduler');
    } finally {
      setActionLoading(null);
    }
  }

  function formatDuration(ms: number | null): string {
    if (ms === null) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60_000).toFixed(1)}m`;
  }

  function formatInterval(ms: number): string {
    if (ms < 60_000) return `${ms / 1000}s`;
    if (ms < 3_600_000) return `${ms / 60_000}m`;
    return `${ms / 3_600_000}h`;
  }

  function formatTimestamp(timestamp: number | null): string {
    if (timestamp === null) return '-';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return date.toLocaleDateString();
  }

  function formatNextRun(timestamp: number | null): string {
    if (timestamp === null) return 'Stopped';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = date.getTime() - now.getTime();

    if (diff < 0) return 'Now';
    if (diff < 60_000) return 'in <1m';
    if (diff < 3_600_000) return `in ${Math.floor(diff / 60_000)}m`;
    if (diff < 86_400_000) return `in ${Math.floor(diff / 3_600_000)}h`;
    return date.toLocaleDateString();
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-gray-400">Loading schedulers...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="p-3 bg-red-900/50 text-red-200 rounded border border-red-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 md:mb-5">
        <h2 className="m-0 text-white text-xl md:text-2xl">Scheduler Management</h2>
        <div className="text-sm text-gray-400">Auto-refreshes every 5 seconds</div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-800">
              <th className="p-3 text-left border-b-2 border-gray-700 text-gray-300">Name</th>
              <th className="p-3 text-left border-b-2 border-gray-700 text-gray-300">
                Description
              </th>
              <th className="p-3 text-center border-b-2 border-gray-700 text-gray-300">Status</th>
              <th className="p-3 text-center border-b-2 border-gray-700 text-gray-300">Interval</th>
              <th className="p-3 text-left border-b-2 border-gray-700 text-gray-300">Last Run</th>
              <th className="p-3 text-left border-b-2 border-gray-700 text-gray-300">Next Run</th>
              <th className="p-3 text-center border-b-2 border-gray-700 text-gray-300">Duration</th>
              <th className="p-3 text-center border-b-2 border-gray-700 text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {schedulers.map(scheduler => (
              <tr key={scheduler.name} className="border-b border-gray-700 hover:bg-gray-800/50">
                <td className="p-3">
                  <div className="font-mono text-sm text-white">{scheduler.name}</div>
                </td>
                <td className="p-3">
                  <div className="text-sm text-gray-300">{scheduler.description}</div>
                </td>
                <td className="p-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {scheduler.isRunning ? (
                      <span className="px-2 py-1 bg-blue-900/50 text-blue-300 rounded text-xs border border-blue-700">
                        Running
                      </span>
                    ) : scheduler.enabled ? (
                      <span className="px-2 py-1 bg-green-900/50 text-green-300 rounded text-xs border border-green-700">
                        Enabled
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-700 text-gray-400 rounded text-xs border border-gray-600">
                        Disabled
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3 text-center">
                  <span className="text-sm text-gray-300 font-mono">
                    {formatInterval(scheduler.interval)}
                  </span>
                </td>
                <td className="p-3">
                  <div className="text-sm text-gray-400">{formatTimestamp(scheduler.lastRun)}</div>
                </td>
                <td className="p-3">
                  <div className="text-sm text-gray-400">{formatNextRun(scheduler.nextRun)}</div>
                </td>
                <td className="p-3 text-center">
                  <span className="text-sm text-gray-400 font-mono">
                    {formatDuration(scheduler.lastDuration)}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleTrigger(scheduler.name)}
                      disabled={actionLoading === scheduler.name || scheduler.isRunning}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50 text-xs"
                      title="Run now"
                    >
                      {actionLoading === scheduler.name ? '...' : 'Trigger'}
                    </button>
                    <button
                      onClick={() => handleToggle(scheduler.name, scheduler.enabled)}
                      disabled={actionLoading === scheduler.name}
                      className={`px-3 py-1 rounded transition-colors disabled:cursor-not-allowed disabled:opacity-50 text-xs ${
                        scheduler.enabled
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                      title={scheduler.enabled ? 'Disable' : 'Enable'}
                    >
                      {scheduler.enabled ? 'Stop' : 'Start'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {schedulers.map(scheduler => (
          <div key={scheduler.name} className="bg-gray-800 p-4 rounded border border-gray-700">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="font-mono text-sm text-white mb-1">{scheduler.name}</div>
                <div className="text-xs text-gray-400">{scheduler.description}</div>
              </div>
              <div>
                {scheduler.isRunning ? (
                  <span className="px-2 py-1 bg-blue-900/50 text-blue-300 rounded text-xs border border-blue-700">
                    Running
                  </span>
                ) : scheduler.enabled ? (
                  <span className="px-2 py-1 bg-green-900/50 text-green-300 rounded text-xs border border-green-700">
                    Enabled
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-gray-700 text-gray-400 rounded text-xs border border-gray-600">
                    Disabled
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div>
                <span className="text-gray-500">Interval:</span>
                <span className="ml-1 text-gray-300 font-mono">
                  {formatInterval(scheduler.interval)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Duration:</span>
                <span className="ml-1 text-gray-300 font-mono">
                  {formatDuration(scheduler.lastDuration)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Last Run:</span>
                <span className="ml-1 text-gray-300">{formatTimestamp(scheduler.lastRun)}</span>
              </div>
              <div>
                <span className="text-gray-500">Next Run:</span>
                <span className="ml-1 text-gray-300">{formatNextRun(scheduler.nextRun)}</span>
              </div>
            </div>

            {scheduler.lastError && (
              <div className="mb-3 p-2 bg-red-900/30 text-red-300 rounded text-xs border border-red-700">
                {scheduler.lastError}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => handleTrigger(scheduler.name)}
                disabled={actionLoading === scheduler.name || scheduler.isRunning}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50 text-sm"
              >
                {actionLoading === scheduler.name ? 'Loading...' : 'Trigger Now'}
              </button>
              <button
                onClick={() => handleToggle(scheduler.name, scheduler.enabled)}
                disabled={actionLoading === scheduler.name}
                className={`flex-1 px-3 py-2 rounded transition-colors disabled:cursor-not-allowed disabled:opacity-50 text-sm ${
                  scheduler.enabled
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {scheduler.enabled ? 'Stop' : 'Start'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
