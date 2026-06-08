export function formatDuration(ms: number | null): string {
  if (ms === null) {
    return '-';
  }
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60_000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  return `${(ms / 60_000).toFixed(1)}m`;
}

export function formatInterval(ms: number): string {
  if (ms < 60_000) {
    return `${ms / 1000}s`;
  }
  if (ms < 3_600_000) {
    return `${ms / 60_000}m`;
  }
  return `${ms / 3_600_000}h`;
}

export function formatTimestamp(timestamp: number | null): string {
  if (timestamp === null) {
    return '-';
  }
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60_000) {
    return 'just now';
  }
  if (diff < 3_600_000) {
    return `${Math.floor(diff / 60_000)}m ago`;
  }
  if (diff < 86_400_000) {
    return `${Math.floor(diff / 3_600_000)}h ago`;
  }
  return date.toLocaleDateString();
}

export function formatNextRun(timestamp: number | null): string {
  if (timestamp === null) {
    return 'Stopped';
  }
  const date = new Date(timestamp);
  const now = new Date();
  const diff = date.getTime() - now.getTime();

  if (diff < 0) {
    return 'Now';
  }
  if (diff < 60_000) {
    return 'in <1m';
  }
  if (diff < 3_600_000) {
    return `in ${Math.floor(diff / 60_000)}m`;
  }
  if (diff < 86_400_000) {
    return `in ${Math.floor(diff / 3_600_000)}h`;
  }
  return date.toLocaleDateString();
}
