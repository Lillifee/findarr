import type { ReactNode } from 'react';

import { PageContainer } from './PageContainer';

interface StickyHeaderProps {
  children: ReactNode;
}

export function StickyHeader({ children }: StickyHeaderProps) {
  return (
    <div className="sticky top-0 z-30 border-b border-gray-700/50 bg-gray-800/90 shadow-2xl backdrop-blur-md">
      <PageContainer className="py-3">{children}</PageContainer>
    </div>
  );
}
