import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'solid' | 'transparent';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: ReactNode;
}

const variants = {
  glass: 'bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 shadow-xl',
  solid: 'bg-gray-800 border border-gray-700 shadow-xl',
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
  const baseStyles = 'rounded-lg';

  return (
    <div
      className={`${baseStyles} ${variants[variant]} ${paddings[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
