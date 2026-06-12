import type { ReactNode } from 'react';

import { CenteredState } from './CenteredState';
import { Icon } from './Icon';

interface ErrorStateProps {
  message: string;
  action?: ReactNode;
}

export function ErrorState({ message, action }: ErrorStateProps) {
  return (
    <CenteredState>
      <Icon className="text-red-500" name="error" size="display" />
      <p className="text-lg font-medium text-red-400">{message}</p>
      {action}
    </CenteredState>
  );
}
