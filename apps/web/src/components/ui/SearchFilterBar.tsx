import type { ReactNode } from 'react';

import { StickyHeader } from './StickyHeader';

interface SearchFilterBarProps {
  search: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
}

export function SearchFilterBar({ search, filters, actions }: SearchFilterBarProps) {
  return (
    <StickyHeader>
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">{search}</div>
        {filters}
        {actions}
      </div>
    </StickyHeader>
  );
}
