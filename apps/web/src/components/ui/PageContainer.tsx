import type { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export function PageContainer({ children, className = '' }: PageContainerProps) {
  return <div className={`mx-auto max-w-7xl px-4 md:px-8 ${className}`}>{children}</div>;
}
