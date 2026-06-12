import { isDefined } from '@findarr/shared/utils';
import type { InputHTMLAttributes, ReactNode } from 'react';

import { inputSizes, type Size } from './sizes';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'search';
  fontSize?: Size;
  error?: boolean;
  prefixIcon?: ReactNode;
  suffixIcon?: ReactNode;
  label?: string;
}

export function Input({
  variant = 'default',
  fontSize = 'md',
  error = false,
  prefixIcon,
  suffixIcon,
  label,
  className = '',
  ...props
}: InputProps) {
  const baseStyles =
    'w-full rounded-lg border text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors';

  const variantStyles = {
    default: 'border-zinc-800 bg-zinc-900 hover:border-zinc-700',
    search: 'border-zinc-800 bg-zinc-900 hover:border-zinc-700 focus:bg-zinc-900',
  };

  const errorStyles = error ? 'border-red-500 focus:ring-red-500' : variant === 'search' ? '' : '';

  const containerStyles = 'relative flex items-center';

  if (isDefined(prefixIcon) || isDefined(suffixIcon)) {
    return (
      <div className="w-full">
        {isDefined(label) && (
          <label className="mb-2 block text-sm font-medium text-gray-300">{label}</label>
        )}
        <div className={containerStyles}>
          {isDefined(prefixIcon) && (
            <div className="pointer-events-none absolute left-3 text-gray-400">{prefixIcon}</div>
          )}
          <input
            className={`${baseStyles} ${variantStyles[variant]} ${inputSizes[fontSize]} ${errorStyles} ${isDefined(prefixIcon) ? 'pl-10' : ''} ${isDefined(suffixIcon) ? 'pr-10' : ''} ${className}`}
            {...props}
          />
          {isDefined(suffixIcon) && (
            <div className="absolute right-3 text-gray-400">{suffixIcon}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {isDefined(label) && (
        <label className="mb-2 block text-sm font-medium text-gray-300">{label}</label>
      )}
      <input
        className={`${baseStyles} ${variantStyles[variant]} ${inputSizes[fontSize]} ${errorStyles} ${className}`}
        {...props}
      />
    </div>
  );
}
