import type { ReactNode } from 'react';

import { CenteredState } from './CenteredState';

interface ErrorStateProps {
  message: string;
  action?: ReactNode;
}

export function ErrorState({ message, action }: ErrorStateProps) {
  return (
    <CenteredState>
      <svg className="h-16 w-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p className="text-lg font-medium text-red-400">{message}</p>
      {action}
    </CenteredState>
  );
}
