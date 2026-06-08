import type { Feedback } from './feedback';

export function InlineFeedback({ tone, message }: Feedback) {
  const toneClass =
    tone === 'error' ? 'border-red-800/60 text-red-300' : 'border-emerald-800/60 text-emerald-300';
  const dotClass = tone === 'error' ? 'bg-red-400' : 'bg-emerald-400';

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border border-dashed bg-gray-900/30 px-3 py-2 text-sm ${toneClass}`}
    >
      <span className={`h-2 w-2 flex-none rounded-full ${dotClass}`} aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
