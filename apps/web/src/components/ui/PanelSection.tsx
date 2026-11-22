import type { PropsWithChildren } from 'react';

interface PanelSectionProps {
  className?: string;
  heading?: string;
  plain?: boolean;
}

export function PanelSection({
  children,
  heading,
  plain = false,
  className = '',
}: PropsWithChildren<PanelSectionProps>) {
  const Container = heading === undefined ? 'div' : 'section';
  return (
    <Container
      aria-label={heading}
      className={`${plain ? '' : 'rounded-xl border border-zinc-800 bg-zinc-900/35 p-4'} ${className}`}
    >
      {heading !== undefined && (
        <h2 className="mb-2 text-xs font-semibold tracking-wide text-zinc-400 uppercase">
          {heading}
        </h2>
      )}
      {children}
    </Container>
  );
}
