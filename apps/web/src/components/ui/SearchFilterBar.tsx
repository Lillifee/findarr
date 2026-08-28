import type { ReactNode } from 'react';

import { StickyHeader } from './StickyHeader';

interface SearchFilterBarProps {
  search: ReactNode;
  filters?: ReactNode;
}

export function SearchFilterBar({ search, filters }: SearchFilterBarProps) {
  return (
    <StickyHeader>
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">{search}</div>
        {filters}
      </div>
    </StickyHeader>
  );
}
