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
    'w-full bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all';

  const variantStyles = {
    default: 'px-4 py-3',
    search: 'px-4 py-2.5 md:py-3',
  };

  const errorStyles = error ? 'border-red-500 focus:ring-red-500' : 'border-gray-600';

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
