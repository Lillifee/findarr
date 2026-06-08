import type { ConnectionStatus } from './connectionStatus';

const STATUS_CONFIG: Record<ConnectionStatus, { label: string; className: string }> = {
  loading: { label: 'Loading\u2026', className: 'bg-gray-700 text-gray-400' },
  dirty: {
    label: 'Unsaved changes',
    className: 'border border-yellow-700 bg-yellow-900/50 text-yellow-400',
  },
  'not-configured': { label: 'Not configured', className: 'bg-gray-700 text-gray-400' },
  ready: {
    label: 'Ready to test',
    className: 'border border-blue-700/70 bg-blue-900/40 text-blue-300',
  },
  connected: {
    label: 'Connected',
    className: 'border border-green-700 bg-green-900/50 text-green-400',
  },
  disconnected: {
    label: 'Disconnected',
    className: 'border border-red-700 bg-red-900/50 text-red-400',
  },
};

export function ConnectionStatusBadge({ status }: { status: ConnectionStatus }) {
  const config = STATUS_CONFIG[status];

  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
