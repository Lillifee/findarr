import type { SchedulerInfo } from '@findarr/shared/scheduler';
import { useCallback, useEffect, useState } from 'react';

import { schedulerService, adminSchedulerService } from '../services/api';

const REFRESH_INTERVAL_MS = 5000;

interface SchedulersState {
  schedulers: SchedulerInfo[];
  isLoading: boolean;
  error: string;
}

export interface SchedulersAdmin {
  schedulers: SchedulerInfo[];
  isLoading: boolean;
  error: string;
  actionLoading: string | null;
  trigger: (name: string) => Promise<void>;
  toggle: (name: string, enabled: boolean) => Promise<void>;
}

const initialState: SchedulersState = {
  schedulers: [],
  isLoading: true,
  error: '',
};

export function useSchedulers(): SchedulersAdmin {
  const [state, setState] = useState<SchedulersState>(initialState);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const schedulers = await schedulerService.listAll();
      setState({ schedulers, isLoading: false, error: '' });
    } catch {
      setState((prev) => ({ ...prev, isLoading: false, error: 'Failed to load schedulers' }));
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

  const runSchedulerAction = useCallback(
    async (name: string, action: () => Promise<void>, errorMessage: string) => {
      setActionLoading(name);
      try {
        await action();
        await load();
      } catch {
        alert(errorMessage);
      } finally {
        setActionLoading(null);
      }
    },
    [load],
  );

  const trigger = useCallback(
    async (name: string) => {
      await runSchedulerAction(
        name,
        async () => adminSchedulerService.trigger(name),
        'Failed to trigger scheduler',
      );
    },
    [runSchedulerAction],
  );

  const toggle = useCallback(
    async (name: string, enabled: boolean) => {
      await runSchedulerAction(
        name,
        async () =>
          enabled ? adminSchedulerService.stop(name) : adminSchedulerService.start(name),
        'Failed to toggle scheduler',
      );
    },
    [runSchedulerAction],
  );

  return { ...state, actionLoading, trigger, toggle };
}
