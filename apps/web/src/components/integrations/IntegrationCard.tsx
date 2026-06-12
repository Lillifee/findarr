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
    <Card variant="solid" padding="md">
      <div className="mb-5 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <ConnectionStatusBadge status={status} />
      </div>
      <p className="-mt-3 mb-5 text-sm text-gray-400">{description}</p>

      <form onSubmit={onSubmit} className="space-y-4">
        {children}
        {actions}
      </form>
    </Card>
  );
}
