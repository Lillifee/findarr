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

  if (prefixIcon || suffixIcon) {
    return (
      <div className="w-full">
        {label && <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>}
        <div className={containerStyles}>
          {prefixIcon && (
            <div className="absolute left-3 text-gray-400 pointer-events-none">{prefixIcon}</div>
          )}
          <input
            className={`${baseStyles} ${variantStyles[variant]} ${errorStyles} ${prefixIcon ? 'pl-10' : ''} ${suffixIcon ? 'pr-10' : ''} ${className}`}
            {...props}
          />
          {suffixIcon && <div className="absolute right-3 text-gray-400">{suffixIcon}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>}
      <input
        className={`${baseStyles} ${variantStyles[variant]} ${errorStyles} ${className}`}
        {...props}
      />
    </div>
  );
}
