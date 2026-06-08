import type { ReactNode } from 'react';

interface EmptyStateProps {
  message: string;
  title?: string;
  icon?: ReactNode;
  className?: string;
}

const defaultIcon = (
  <svg className="h-12 w-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
    />
  </svg>
);

export function EmptyState({
  message,
  title,
  icon = defaultIcon,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`p-8 text-center text-gray-500 md:p-16 ${className}`}>
      <div className="flex flex-col items-center gap-4">
        {icon}
        {title !== undefined && <h3 className="text-xl font-semibold text-gray-400">{title}</h3>}
        <p className="max-w-md text-base md:text-lg">{message}</p>
      </div>
    </div>
  );
}
