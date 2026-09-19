import type { CSSProperties, ReactNode } from 'react';

interface PopupPanelProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties | undefined;
}

export function PopupPanel({ children, className = '', style }: PopupPanelProps) {
  return (
    <div
      className={`overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 shadow-[0_24px_80px_rgba(0,0,0,0.45)] ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
