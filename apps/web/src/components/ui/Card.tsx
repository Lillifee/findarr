import type { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'solid' | 'transparent';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const variants = {
  glass: 'border border-zinc-800 bg-zinc-900/35 shadow-[0_18px_50px_rgba(0,0,0,0.18)]',
  solid: 'border border-zinc-800 bg-zinc-900/45',
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
