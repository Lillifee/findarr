import type { ChangeEvent, ReactNode } from 'react';

import { Card } from '../ui/Card';
import type { ConnectionStatus } from './connectionStatus';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';

interface IntegrationCardProps {
  title: string;
  description: string;
  status: ConnectionStatus;
  onSubmit: (event: ChangeEvent<HTMLFormElement>) => void;

  actions: ReactNode;
}

export function IntegrationCard({
  title,
  description,
  status,
  onSubmit,
  children,
  actions,
}: React.PropsWithChildren<IntegrationCardProps>) {
  return (
    <Card variant="solid" padding="none" className="overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-zinc-800 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm text-zinc-400">{description}</p>
        </div>
        <ConnectionStatusBadge status={status} />
      </div>

      <form onSubmit={onSubmit}>
        <div className="px-5 py-5 md:px-6">{children}</div>
        <div className="border-t border-zinc-800 px-5 py-4 md:px-6">{actions}</div>
      </form>
    </Card>
  );
}
