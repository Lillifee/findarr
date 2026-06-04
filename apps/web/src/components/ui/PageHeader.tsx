import { isDefined } from '@findarr/shared/utils';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-white md:text-3xl">{title}</h1>
        {isDefined(description) && (
          <p className="mt-1.5 text-sm text-gray-400 md:text-base">{description}</p>
        )}
      </div>
      {isDefined(action) && <div className="shrink-0">{action}</div>}
    </div>
  );
}
