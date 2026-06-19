import type { ReactNode } from 'react';

import { Icon } from './Icon';
import { Spinner, type SpinnerSize } from './Spinner';

export interface StateDisplayProps {
  title?: string;
  message?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

const defaultIcon = <Icon className="text-zinc-600" name="info" size="display" />;

export function StateDisplay({
  message,
  title,
  icon = defaultIcon,
  action,
  className = '',
}: StateDisplayProps) {
  return (
    <div className={`p-8 text-center text-zinc-500 md:p-16 ${className}`}>
      <div className="flex flex-col items-center gap-4">
        {icon}
        {title !== undefined && <h3 className="text-xl font-semibold text-zinc-300">{title}</h3>}
        {message !== undefined && <p className="max-w-md text-base md:text-lg">{message}</p>}
        {action !== undefined && (
          <div className="mt-2 flex flex-wrap justify-center gap-3">{action}</div>
        )}
      </div>
    </div>
  );
}

export interface LoadingStateProps extends Omit<StateDisplayProps, 'icon' | 'title'> {
  title?: string;
  spinnerSize?: SpinnerSize;
}

export function LoadingState({ title = '', spinnerSize = 'display', ...props }: LoadingStateProps) {
  const titleProps = title ? { title } : {};
  return (
    <StateDisplay
      {...props}
      {...titleProps}
      icon={<Spinner className="text-amber-400" label="Loading" size={spinnerSize} />}
    />
  );
}
