import type { ButtonHTMLAttributes } from 'react';

import { buttonSizes, type Size } from './sizes';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon' | 'danger' | 'success';
  size?: Size;
  loading?: boolean;
}

const variants = {
  primary:
    'border border-amber-400/70 bg-amber-500 text-gray-950 hover:border-amber-300 hover:bg-amber-400 shadow-none',
  secondary:
    'border border-gray-700/60 bg-gray-800/70 backdrop-blur-sm text-gray-200 hover:border-gray-500 hover:bg-gray-700/80 shadow-none',
  ghost: 'text-gray-400 hover:bg-gray-700/60 hover:text-white',
  icon: 'text-gray-400 hover:bg-gray-700/60 hover:text-white rounded-lg',
  danger:
    'border border-red-700/70 bg-red-900/30 text-red-200 hover:border-red-500 hover:bg-red-800/50 hover:text-white shadow-none',
  success:
    'border border-emerald-700/70 bg-emerald-900/30 text-emerald-200 hover:border-emerald-500 hover:bg-emerald-800/50 hover:text-white shadow-none',
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
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50';

  const variantStyles = variants[variant];
  const sizeStyles = buttonSizes[size];

  return (
    <button
      className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
      disabled={Boolean(disabled) || loading}
      {...props}
    >
      {loading && <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-current" />}
      {children}
    </button>
  );
}
