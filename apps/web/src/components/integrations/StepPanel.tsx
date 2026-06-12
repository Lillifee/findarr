import type { PropsWithChildren } from 'react';

interface StepPanelProps {
  title: string;
  message: string;
}

export function StepPanel({ title, message, children }: PropsWithChildren<StepPanelProps>) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase">{title}</p>
        <p className="text-sm text-zinc-300">{message}</p>
      </div>
      {children}
    </section>
  );
}
