import type { PropsWithChildren } from 'react';

interface StepPanelProps {
  title: string;
  message: string;
}

export function StepPanel({ title, message, children }: PropsWithChildren<StepPanelProps>) {
  return (
    <div className="space-y-4 rounded-xl border border-gray-700/50 bg-gray-900/30 p-4">
      <div className="space-y-1">
        <p className="text-xs font-semibold tracking-[0.18em] text-gray-500 uppercase">{title}</p>
        <p className="text-sm text-gray-300">{message}</p>
      </div>
      {children}
    </div>
  );
}
