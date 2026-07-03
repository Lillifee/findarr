import type { LogEntry, LogLevel } from '@findarr/shared/logs';
import { useCallback, useEffect, useState } from 'react';

import { adminLogsService } from '../services/api';

export interface LogsAdmin {
  logs: LogEntry[];
  level: LogLevel | null;
  isLoading: boolean;
  error: string;
  refresh: () => Promise<void>;
  changeLevel: (level: LogLevel) => Promise<void>;
}

export function useLogs(): LogsAdmin {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [level, setLevel] = useState<LogLevel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [{ entries }, currentLevel] = await Promise.all([
        adminLogsService.getLogs(),
        adminLogsService.getLevel(),
      ]);
      setLogs(entries);
      setLevel(currentLevel);
      setError('');
    } catch {
      setError('Failed to load logs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const changeLevel = useCallback(async (next: LogLevel) => {
    setLevel(await adminLogsService.setLevel(next));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { logs, level, isLoading, error, refresh, changeLevel };
}
