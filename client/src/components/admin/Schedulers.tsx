import type { SchedulerInfo } from '@findarr/shared';
import { useState, useEffect } from 'react';
import { schedulerService, adminSchedulerService } from '../../services/api';
import { asVoid } from '../../utils/asyncHandlers';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PageHeader } from '../ui/PageHeader';

export function Schedulers() {
  const [schedulers, setSchedulers] = useState<SchedulerInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    void loadSchedulers();
    // Refresh every 5 seconds
    const interval = setInterval(asVoid(loadSchedulers), 5000);
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

  function renderStatus(scheduler: SchedulerInfo) {
    if (scheduler.isRunning) {
      return (
        <span className="inline-flex rounded-full border border-blue-800 bg-blue-950/40 px-2.5 py-1 text-xs text-blue-200">
          Running
        </span>
      );
    }

    if (scheduler.enabled) {
      return (
        <span className="inline-flex rounded-full border border-emerald-800 bg-emerald-950/40 px-2.5 py-1 text-xs text-emerald-200">
          Enabled
        </span>
      );
    }

    return (
      <span className="inline-flex rounded-full border border-gray-700 bg-gray-800 px-2.5 py-1 text-xs text-gray-300">
        Disabled
      </span>
    );
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
    <div className="space-y-5">
      <PageHeader
        title="Schedulers"
        description="Monitor recurring jobs and trigger them manually when needed."
        action={<div className="text-sm text-gray-400">Auto-refreshes every 5 seconds</div>}
      />

      {/* Desktop Table View */}
      <Card variant="solid" padding="none" className="hidden overflow-x-auto lg:block">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-800 text-left text-sm text-gray-400">
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Description</th>
              <th className="px-5 py-3 text-center">Status</th>
              <th className="px-5 py-3 text-center">Interval</th>
              <th className="px-5 py-3">Last Run</th>
              <th className="px-5 py-3">Next Run</th>
              <th className="px-5 py-3 text-center">Duration</th>
              <th className="px-5 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {schedulers.map(scheduler => (
              <tr key={scheduler.name} className="border-b border-gray-800 last:border-b-0">
                <td className="px-5 py-4">
                  <div className="font-mono text-sm text-white">{scheduler.name}</div>
                </td>
                <td className="px-5 py-4">
                  <div className="text-sm text-gray-300">{scheduler.description}</div>
                </td>
                <td className="px-5 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {renderStatus(scheduler)}
                  </div>
                </td>
                <td className="px-5 py-4 text-center">
                  <span className="text-sm text-gray-300 font-mono">
                    {formatInterval(scheduler.interval)}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="text-sm text-gray-400">{formatTimestamp(scheduler.lastRun)}</div>
                </td>
                <td className="px-5 py-4">
                  <div className="text-sm text-gray-400">{formatNextRun(scheduler.nextRun)}</div>
                </td>
                <td className="px-5 py-4 text-center">
                  <span className="text-sm text-gray-400 font-mono">
                    {formatDuration(scheduler.lastDuration)}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      onClick={asVoid(() => handleTrigger(scheduler.name))}
                      disabled={actionLoading === scheduler.name || scheduler.isRunning}
                      variant="secondary"
                      size="sm"
                      title="Run now"
                    >
                      {actionLoading === scheduler.name ? '...' : 'Trigger'}
                    </Button>
                    <Button
                      onClick={asVoid(() => handleToggle(scheduler.name, scheduler.enabled))}
                      disabled={actionLoading === scheduler.name}
                      variant={scheduler.enabled ? 'danger' : 'success'}
                      size="sm"
                      title={scheduler.enabled ? 'Disable' : 'Enable'}
                    >
                      {scheduler.enabled ? 'Stop' : 'Start'}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {schedulers.map(scheduler => (
          <Card key={scheduler.name} variant="solid" padding="md">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="font-mono text-sm text-white mb-1">{scheduler.name}</div>
                <div className="text-xs text-gray-400">{scheduler.description}</div>
              </div>
              <div>{renderStatus(scheduler)}</div>
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
              <Button
                onClick={asVoid(() => handleTrigger(scheduler.name))}
                disabled={actionLoading === scheduler.name || scheduler.isRunning}
                variant="secondary"
                size="sm"
                className="flex-1"
              >
                {actionLoading === scheduler.name ? 'Loading...' : 'Trigger Now'}
              </Button>
              <Button
                onClick={asVoid(() => handleToggle(scheduler.name, scheduler.enabled))}
                disabled={actionLoading === scheduler.name}
                variant={scheduler.enabled ? 'danger' : 'success'}
                size="sm"
                className="flex-1"
              >
                {scheduler.enabled ? 'Stop' : 'Start'}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
