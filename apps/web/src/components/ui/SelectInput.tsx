import { isDefined } from '@findarr/shared/utils';
import type { SelectHTMLAttributes } from 'react';

import { Icon } from './Icon';
import { inputSizes, type Size } from './sizes';

export interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  fontSize?: Size;
  error?: boolean;
}

export function SelectInput({
  label,
  fontSize = 'md',
  error = false,
  className = '',
  children,
  ...props
}: SelectInputProps) {
  const baseStyles =
    'w-full appearance-none rounded-lg border bg-zinc-900 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent';
  const stateStyles = error
    ? 'border-red-500 focus:ring-red-500'
    : 'border-zinc-800 hover:border-zinc-700';

  return (
    <div className="w-full">
      {isDefined(label) && (
        <label className="mb-2 block text-sm font-medium text-gray-300">{label}</label>
      )}
      <div className="relative">
        <select
          className={`${baseStyles} ${inputSizes[fontSize]} pr-10 ${stateStyles} ${className}`}
          {...props}
        >
          {children}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
          <Icon name="expand_more" size="sm" />
        </span>
      </div>
    </div>
  );
}
