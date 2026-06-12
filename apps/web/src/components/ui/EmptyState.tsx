import type { ReactNode } from 'react';

import { Icon } from './Icon';

interface EmptyStateProps {
  message: string;
  title?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

const defaultIcon = <Icon className="text-zinc-600" name="info" size="display" />;

export function EmptyState({
  message,
  title,
  icon = defaultIcon,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`p-8 text-center text-zinc-500 md:p-16 ${className}`}>
      <div className="flex flex-col items-center gap-4">
        {icon}
        {title !== undefined && <h3 className="text-xl font-semibold text-zinc-300">{title}</h3>}
        <p className="max-w-md text-base md:text-lg">{message}</p>
        {action !== undefined && (
          <div className="mt-2 flex flex-wrap justify-center gap-3">{action}</div>
        )}
      </div>
    </div>
  );
}
