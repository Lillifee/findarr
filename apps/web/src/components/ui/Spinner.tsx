interface SpinnerProps {
  className?: string;
}

export function Spinner({ className = '' }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`h-12 w-12 animate-spin rounded-full border-b-2 border-amber-500 ${className}`}
    />
  );
}
