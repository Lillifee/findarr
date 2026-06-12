import type { ConnectionStatus } from './connectionStatus';

const STATUS_CONFIG: Record<ConnectionStatus, { label: string; className: string }> = {
  loading: {
    label: 'Loading...',
    className: 'border border-zinc-800 bg-zinc-900 text-zinc-400',
  },
  dirty: {
    label: 'Unsaved changes',
    className: 'border border-amber-700/70 bg-amber-950/60 text-amber-300',
  },
  'not-configured': {
    label: 'Not configured',
    className: 'border border-zinc-800 bg-zinc-900 text-zinc-400',
  },
  ready: {
    label: 'Ready to test',
    className: 'border border-amber-700/70 bg-amber-950/50 text-amber-300',
  },
  connected: {
    label: 'Connected',
    className: 'border border-emerald-800 bg-emerald-950/60 text-emerald-300',
  },
  disconnected: {
    label: 'Disconnected',
    className: 'border border-red-900/80 bg-red-950/60 text-red-300',
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
