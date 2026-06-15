import type { ButtonHTMLAttributes } from 'react';

import { buttonSizes, type Size } from './sizes';
import { Spinner } from './Spinner';
import { controlSurface } from './theme';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon' | 'danger' | 'success';
  size?: Size;
  loading?: boolean;
}

const variants = {
  primary:
    'border border-amber-400/70 bg-amber-500 text-gray-950 hover:border-amber-300 hover:bg-amber-400 shadow-none',
  secondary: `${controlSurface} shadow-none`,
  ghost: 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100',
  icon: 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 rounded-lg',
  danger:
    'border border-red-900/80 bg-red-950/60 text-red-200 hover:border-red-700 hover:bg-red-900/60 hover:text-white shadow-none',
  success:
    'border border-emerald-900/80 bg-emerald-950/60 text-emerald-200 hover:border-emerald-700 hover:bg-emerald-900/60 hover:text-white shadow-none',
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
      {loading && <Spinner className="text-current" label={null} size="sm" />}
      {children}
    </button>
  );
}
