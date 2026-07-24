import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ClearAllButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  hidden?: boolean;
}

export function ClearAllButton({
  children,
  disabled,
  hidden = false,
  className = '',
  ...props
}: ClearAllButtonProps) {
  const isDisabled = Boolean(disabled);

  return (
    <button
      type="button"
      disabled={disabled}
      aria-hidden={hidden}
      tabIndex={hidden ? -1 : 0}
      className={`inline-flex min-h-8 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100 disabled:cursor-not-allowed ${
        hidden ? 'pointer-events-none invisible opacity-0' : 'opacity-100'
      } ${isDisabled ? 'opacity-50' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
