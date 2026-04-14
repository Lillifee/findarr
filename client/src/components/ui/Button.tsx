import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { buttonSizes, type Size } from './sizes';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon';
  size?: Size;
  loading?: boolean;
  children: ReactNode;
}

const variants = {
  primary:
    'bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-700 hover:to-orange-700 shadow-md disabled:from-gray-600 disabled:to-gray-600',
  secondary:
    'bg-gray-800/60 backdrop-blur-sm text-amber-400 border border-gray-600/50 hover:bg-gray-700/80',
  ghost: 'text-gray-300 hover:bg-gray-700/50',
  icon: 'text-gray-300 hover:bg-gray-700/50 rounded-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50';

  const variantStyles = variants[variant];
  const sizeStyles = buttonSizes[size];

  return (
    <button
      className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
      )}
      {children}
    </button>
  );
}
