import type { SchedulerInfo } from '@findarr/shared/scheduler';
import { useCallback, useEffect, useState } from 'react';

import { schedulerService, adminSchedulerService } from '../services/api';

const REFRESH_INTERVAL_MS = 5000;

export interface SchedulersAdmin {
  schedulers: SchedulerInfo[];
  isLoading: boolean;
  error: string;
  actionLoading: string | null;
  trigger: (name: string) => Promise<void>;
  toggle: (name: string, enabled: boolean) => Promise<void>;
}

export function useSchedulers(): SchedulersAdmin {
  const [schedulers, setSchedulers] = useState<SchedulerInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await schedulerService.listAll();
      setSchedulers(data);
      setError('');
    } catch {
      setError('Failed to load schedulers');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(() => {
      void load();
    }, REFRESH_INTERVAL_MS);
    return () => {
      clearInterval(interval);
    };
  }, [load]);

  const trigger = useCallback(
    async (name: string) => {
      setActionLoading(name);
      try {
        await adminSchedulerService.trigger(name);
        await load();
      } catch {
        alert('Failed to trigger scheduler');
      } finally {
        setActionLoading(null);
      }
    },
    [load],
  );

  const toggle = useCallback(
    async (name: string, enabled: boolean) => {
      setActionLoading(name);
      try {
        await (enabled ? adminSchedulerService.stop(name) : adminSchedulerService.start(name));
        await load();
      } catch {
        alert('Failed to toggle scheduler');
      } finally {
        setActionLoading(null);
      }
    },
    [load],
  );

  return { schedulers, isLoading, error, actionLoading, trigger, toggle };
}
