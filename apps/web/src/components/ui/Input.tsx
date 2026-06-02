import { isDefined } from '@findarr/shared';
import type { InputHTMLAttributes, ReactNode } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'search';
  error?: boolean;
  prefixIcon?: ReactNode;
  suffixIcon?: ReactNode;
  label?: string;
}

export function Input({
  variant = 'default',
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
    default:
      'min-h-10 border-gray-700/60 bg-gray-800/70 px-3.5 py-2.5 text-sm hover:border-gray-500',
    search:
      'min-h-10 border-gray-700/60 bg-gray-800/70 px-3.5 py-2 text-sm hover:border-gray-500 focus:bg-gray-800/85',
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
            className={`${baseStyles} ${variantStyles[variant]} ${errorStyles} ${isDefined(prefixIcon) ? 'pl-10' : ''} ${isDefined(suffixIcon) ? 'pr-10' : ''} ${className}`}
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
        className={`${baseStyles} ${variantStyles[variant]} ${errorStyles} ${className}`}
        {...props}
      />
    </div>
  );
}
