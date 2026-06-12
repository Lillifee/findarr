import type { PropsWithChildren } from 'react';

interface PanelSectionProps {
  className?: string;
}

export function PanelSection({ children, className = '' }: PropsWithChildren<PanelSectionProps>) {
  return (
    <div className={`rounded-xl border border-zinc-800 bg-zinc-900/35 p-4 ${className}`}>
      {children}
    </div>
  );
}
