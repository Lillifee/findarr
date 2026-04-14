/**
 * Standardized size tokens for UI components
 * Use these to maintain consistency across the design system
 */

export const buttonSizes = {
  sm: 'px-3 py-1.5 text-xs md:text-sm',
  md: 'px-4 py-2 text-sm md:text-base',
  lg: 'px-6 py-3 text-base md:text-lg',
} as const;

export const badgeSizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base',
} as const;

export const statusBadgeSizes = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 md:px-2.5 py-0.5 md:py-1 text-xs',
  lg: 'px-2.5 md:px-3 py-1 md:py-1.5 text-sm',
} as const;

export const inputSizes = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2.5 md:py-3 text-base',
  lg: 'px-5 py-3.5 md:py-4 text-lg',
} as const;

export type Size = 'sm' | 'md' | 'lg';
