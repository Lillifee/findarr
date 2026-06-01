import type { ReactNode, SelectHTMLAttributes } from 'react';

export interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: boolean;
  children: ReactNode;
}

export function SelectInput({
  label,
  error = false,
  className = '',
  children,
  ...props
}: SelectInputProps) {
  const baseStyles =
    'w-full min-h-10 appearance-none rounded-lg border bg-gray-800/70 px-3.5 py-2 pr-10 text-sm text-white transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent';
  const stateStyles = error
    ? 'border-red-500 focus:ring-red-500'
    : 'border-gray-700/60 hover:border-gray-500';

  return (
    <div className="w-full">
      {label && <label className="mb-2 block text-sm font-medium text-gray-300">{label}</label>}
      <div className="relative">
        <select className={`${baseStyles} ${stateStyles} ${className}`} {...props}>
          {children}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </div>
    </div>
  );
}
