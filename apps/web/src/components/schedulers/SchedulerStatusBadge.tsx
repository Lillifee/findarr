import type { SchedulerInfo } from '@findarr/shared/scheduler';
import { useTranslation } from 'react-i18next';

interface SchedulerStatusBadgeProps {
  scheduler: SchedulerInfo;
}

export function SchedulerStatusBadge({ scheduler }: SchedulerStatusBadgeProps) {
  const { t } = useTranslation();

  if (scheduler.isRunning) {
    return (
      <span className="inline-flex rounded-full border border-amber-700/70 bg-amber-950/50 px-2.5 py-1 text-xs text-amber-200">
        {t('status.running')}
      </span>
    );
  }

  if (scheduler.enabled) {
    return (
      <span className="inline-flex rounded-full border border-emerald-800 bg-emerald-950/40 px-2.5 py-1 text-xs text-emerald-200">
        {t('status.enabled')}
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300">
      {t('status.disabled')}
    </span>
  );
}
