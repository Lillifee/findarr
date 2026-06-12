import { isDefined } from '@findarr/shared/utils';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { SelectionIndicator } from './SelectionIndicator';

interface OptionButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  selected?: boolean;
  title: ReactNode;
  description?: ReactNode;
}

export function OptionButton({
  selected = false,
  title,
  description,
  className = '',
  ...props
}: OptionButtonProps) {
  return (
    <button
      type="button"
      className={`rounded-lg border px-3.5 py-3 text-left transition-colors ${
        selected
          ? 'border-amber-400/45 bg-amber-400/12 text-amber-50 hover:border-amber-300/60 hover:bg-amber-400/16'
          : 'border-zinc-800 bg-zinc-900 text-zinc-100 hover:border-zinc-700 hover:bg-zinc-800'
      } ${className}`}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{title}</div>
          {isDefined(description) && (
            <div
              className={`mt-1.5 text-sm leading-5 ${selected ? 'text-amber-100/80' : 'text-zinc-300'}`}
            >
              {description}
            </div>
          )}
        </div>
        <div className="shrink-0">
          <SelectionIndicator selected={selected} />
        </div>
      </div>
    </button>
  );
}
