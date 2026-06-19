import type { ChangeEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Card } from '../ui/Card';

interface IntegrationCardProps {
  title: string;
  description: string;
  enabled?: boolean;
  onToggleEnabled?: () => void;
  onSubmit: (event: ChangeEvent<HTMLFormElement>) => void;
  actions: ReactNode;
}

export function IntegrationCard({
  title,
  description,
  onSubmit,
  enabled = true,
  onToggleEnabled,
  children,
  actions,
}: React.PropsWithChildren<IntegrationCardProps>) {
  const { t } = useTranslation();
  return (
    <Card variant="solid" padding="none" className="overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-zinc-800 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm text-zinc-400">{description}</p>
        </div>
        {onToggleEnabled && (
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={onToggleEnabled}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${enabled ? 'bg-amber-500' : 'bg-zinc-700'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
        )}
      </div>

      {enabled ? (
        <form onSubmit={onSubmit}>
          <div className="px-5 py-5 md:px-6">{children}</div>
          <div className="border-t border-zinc-800 px-5 py-4 md:px-6">{actions}</div>
        </form>
      ) : (
        <div className="px-5 py-6 text-sm text-zinc-500 md:px-6">
          {t('integrationCard.disabled')}
        </div>
      )}
    </Card>
  );
}
