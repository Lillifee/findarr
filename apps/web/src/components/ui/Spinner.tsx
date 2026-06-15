export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'display';

interface SpinnerProps {
  className?: string;
  label?: string | null;
  size?: SpinnerSize;
}

const spinnerSizes: Record<SpinnerSize, string> = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-10 w-10',
  display: 'h-12 w-12 md:h-14 md:w-14',
};

const ringSizes: Record<SpinnerSize, string> = {
  xs: 'border',
  sm: 'border',
  md: 'border-2',
  lg: 'border-2',
  display: 'border-2',
};

export function Spinner({ className = '', label = 'Loading', size = 'display' }: SpinnerProps) {
  return (
    <span
      role={label === null ? undefined : 'status'}
      aria-label={label ?? undefined}
      aria-hidden={label === null ? true : undefined}
      className={`relative inline-flex shrink-0 text-amber-400 ${spinnerSizes[size]} ${className}`}
    >
      <span
        className={`absolute inset-0 rounded-full border-current opacity-20 ${ringSizes[size]}`}
      />
      <span
        className={`absolute inset-0 animate-spin rounded-full border-transparent border-t-current border-r-current ${ringSizes[size]}`}
      />
    </span>
  );
}
