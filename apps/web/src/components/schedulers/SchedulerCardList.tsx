import type { SchedulerInfo } from '@findarr/shared/scheduler';
import { isDefined } from '@findarr/shared/utils';
import type { ReactNode } from 'react';

import {
  formatDuration,
  formatInterval,
  formatNextRun,
  formatTimestamp,
} from '../../utils/schedulerFormat';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { SchedulerStatusBadge } from './SchedulerStatusBadge';

function Stat({ label, value, mono = false }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <span className="block text-[11px] tracking-wide text-gray-500 uppercase">{label}</span>
      <span className={`text-sm text-gray-300 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

interface SchedulerListProps {
  schedulers: SchedulerInfo[];
  actionLoading: string | null;
  onTrigger: (name: string) => void;
  onToggle: (name: string, enabled: boolean) => void;
}

export function SchedulerCardList({
  schedulers,
  actionLoading,
  onTrigger,
  onToggle,
}: SchedulerListProps) {
  return (
    <div className="space-y-3">
      {schedulers.map((scheduler) => {
        const isBusy = actionLoading === scheduler.name;

        return (
          <Card key={scheduler.name} variant="solid" padding="md">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0 xl:w-64 xl:shrink-0">
                <div className="flex items-center gap-2.5">
                  <span className="truncate font-mono text-sm text-white">{scheduler.name}</span>
                  <SchedulerStatusBadge scheduler={scheduler} />
                </div>
                <p className="mt-1 text-xs text-gray-400">{scheduler.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 xl:flex-1">
                <Stat label="Interval" value={formatInterval(scheduler.interval)} mono />
                <Stat label="Duration" value={formatDuration(scheduler.lastDuration)} mono />
                <Stat label="Last Run" value={formatTimestamp(scheduler.lastRun)} />
                <Stat label="Next Run" value={formatNextRun(scheduler.nextRun)} />
              </div>

              <div className="flex gap-2 xl:shrink-0">
                <Button
                  onClick={() => {
                    onTrigger(scheduler.name);
                  }}
                  disabled={isBusy || scheduler.isRunning}
                  variant="secondary"
                  size="sm"
                  className="flex-1 xl:flex-none"
                >
                  {isBusy ? 'Loading...' : 'Trigger'}
                </Button>
                <Button
                  onClick={() => {
                    onToggle(scheduler.name, scheduler.enabled);
                  }}
                  disabled={isBusy}
                  variant={scheduler.enabled ? 'danger' : 'success'}
                  size="sm"
                  className="flex-1 xl:flex-none"
                >
                  {scheduler.enabled ? 'Stop' : 'Start'}
                </Button>
              </div>
            </div>

            {isDefined(scheduler.lastError) && (
              <div className="mt-3 rounded border border-red-700 bg-red-900/30 p-2 text-xs text-red-300">
                {scheduler.lastError}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
