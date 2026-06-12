import type { ButtonHTMLAttributes } from 'react';

import { badgeSizes, type Size } from './sizes';

export interface BadgeProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  size?: Size;
  selected?: boolean;
  interactive?: boolean;
}

const variants = {
  primary:
    'bg-amber-600/20 text-amber-200 border-amber-500/40 hover:bg-amber-600/30 hover:border-amber-500/60',
  secondary:
    'bg-gray-800/60 text-gray-300 border-gray-600/50 hover:bg-gray-700/80 hover:border-gray-500/70',
  success:
    'bg-green-600/20 text-green-200 border-green-500/40 hover:bg-green-600/30 hover:border-green-500/60',
  warning:
    'bg-yellow-600/20 text-yellow-200 border-yellow-500/40 hover:bg-yellow-600/30 hover:border-yellow-500/60',
  danger:
    'bg-red-600/20 text-red-200 border-red-500/40 hover:bg-red-600/30 hover:border-red-500/60',
  info: 'bg-blue-600/20 text-blue-200 border-blue-500/40 hover:bg-blue-600/30 hover:border-blue-500/60',
};

const selectedVariants = {
  primary: 'bg-amber-600 text-white border-amber-500 shadow-md',
  secondary: 'bg-gray-700 text-white border-gray-500 shadow-md',
  success: 'bg-green-600 text-white border-green-500 shadow-md',
  warning: 'bg-yellow-600 text-white border-yellow-500 shadow-md',
  danger: 'bg-red-600 text-white border-red-500 shadow-md',
  info: 'bg-blue-600 text-white border-blue-500 shadow-md',
};

export function Badge({
  variant = 'secondary',
  size = 'md',
  selected = false,
  interactive = false,
  className = '',
  children,
  type = 'button',
  ...props
}: BadgeProps) {
  const baseStyles =
    'inline-flex items-center gap-1.5 rounded-full font-medium border backdrop-blur-sm';
  const variantStyles = selected ? selectedVariants[variant] : variants[variant];
  const sizeStyles = badgeSizes[size];
  const interactiveStyles = interactive ? 'cursor-pointer transition-all duration-200' : '';

  return (
    <button
      type={type}
      aria-pressed={interactive ? selected : undefined}
      className={`${baseStyles} ${variantStyles} ${sizeStyles} ${interactiveStyles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
