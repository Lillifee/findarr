import type { LogEntry } from '@findarr/shared/logs';
import { useCallback, useEffect, useState } from 'react';

import { adminLogsService } from '../services/api';

export interface LogsAdmin {
  logs: LogEntry[];
  isLoading: boolean;
  error: string;
  refresh: () => Promise<void>;
}

export function useLogs(): LogsAdmin {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const { entries } = await adminLogsService.getLogs();
      setLogs(entries);
      setError('');
    } catch {
      setError('Failed to load logs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { logs, isLoading, error, refresh };
}
