import type { SchedulerInfo } from '@findarr/shared/scheduler';

interface SchedulerStatusBadgeProps {
  scheduler: SchedulerInfo;
}

export function SchedulerStatusBadge({ scheduler }: SchedulerStatusBadgeProps) {
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
