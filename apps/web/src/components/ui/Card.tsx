import type { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'solid' | 'transparent';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const variants = {
  glass: 'border border-gray-700/50 bg-gray-800/60 backdrop-blur-md shadow-xl',
  solid: 'border border-gray-700/50 bg-gray-800/85 backdrop-blur-sm shadow-xl',
  transparent: 'bg-transparent',
};

const paddings = {
  none: '',
  sm: 'p-3 md:p-4',
  md: 'p-4 md:p-6',
  lg: 'p-6 md:p-8',
};

export function Card({
  variant = 'glass',
  padding = 'md',
  className = '',
  children,
  ...props
}: CardProps) {
  const baseStyles = 'rounded-xl';

  return (
    <div
      className={`${baseStyles} ${variants[variant]} ${paddings[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
