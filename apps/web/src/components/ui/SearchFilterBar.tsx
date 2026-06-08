import type { ReactNode } from 'react';

import { StickyHeader } from './StickyHeader';

interface SearchFilterBarProps {
  search: ReactNode;
  filters?: ReactNode;
}

export function SearchFilterBar({ search, filters }: SearchFilterBarProps) {
  return (
    <StickyHeader>
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full md:w-auto md:flex-1">{search}</div>
        {filters}
      </div>
    </StickyHeader>
  );
}
