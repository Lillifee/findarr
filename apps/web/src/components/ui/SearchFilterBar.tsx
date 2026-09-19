import { isDefined } from '@findarr/shared/utils';
import type { ReactNode } from 'react';

import { StickyHeader } from './StickyHeader';

interface SearchFilterBarProps {
  search?: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
}

export function SearchFilterBar({ search, filters, actions }: SearchFilterBarProps) {
  return (
    <StickyHeader>
      <div className="flex items-start gap-2 sm:gap-3">
        {filters}
        {isDefined(search) && <div className="min-w-0 flex-1">{search}</div>}
        {isDefined(actions) && <div className="ml-auto">{actions}</div>}
      </div>
    </StickyHeader>
  );
}
