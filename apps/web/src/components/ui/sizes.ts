/**
 * Standardized size tokens for UI components
 * Use these to maintain consistency across the design system
 */

export const buttonSizes = {
  sm: 'min-h-8 px-3 py-1.5 text-sm',
  md: 'min-h-10 px-4 py-2 text-sm',
  lg: 'min-h-12 px-5 py-3 text-base',
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
  sm: 'min-h-8 px-3 py-1.5 text-sm',
  md: 'min-h-10 px-3.5 py-2 text-sm',
  lg: 'min-h-12 px-4 py-3 text-base',
} as const;

export type Size = 'sm' | 'md' | 'lg';
