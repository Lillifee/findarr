import type { ReactNode } from 'react';

import { Icon } from './Icon';
import { statusBadgeSizes, type Size } from './sizes';
import { Spinner } from './Spinner';

export type StatusType =
  | 'available'
  | 'downloaded'
  | 'downloading'
  | 'monitored'
  | 'requested'
  | 'pending'
  | 'warning';

export interface StatusBadgeProps {
  status: StatusType;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'inline';
  size?: Extract<Size, 'sm' | 'md' | 'lg'>;
  icon?: ReactNode;
}

const statusConfig = {
  pending: undefined,
  available: {
    bg: 'bg-emerald-500/88',
    border: 'border-emerald-300/35',
    text: 'text-white',
    label: 'Available',
    icon: <Icon name="check" size="sm" weight={600} />,
  },
  downloaded: {
    bg: 'bg-cyan-500/88',
    border: 'border-cyan-300/35',
    text: 'text-white',
    label: 'Downloaded',
    icon: <Icon name="download" size="sm" weight={600} />,
  },
  downloading: {
    bg: 'bg-amber-500/90',
    border: 'border-amber-300/35',
    text: 'text-white',
    label: 'Downloading',
    icon: <Spinner className="text-white" label={null} size="sm" />,
  },
  monitored: {
    bg: 'bg-zinc-700/92',
    border: 'border-zinc-300/20',
    text: 'text-white',
    label: 'Monitored',
    icon: <Icon filled name="check_circle" size="sm" weight={600} />,
  },
  requested: {
    bg: 'bg-amber-500/90',
    border: 'border-amber-300/35',
    text: 'text-white',
    label: 'Requested',
    icon: <Icon filled name="notifications" size="sm" weight={600} />,
  },
  warning: {
    bg: 'bg-orange-500/90',
    border: 'border-orange-300/35',
    text: 'text-white',
    label: 'Warning',
    icon: <Icon filled name="warning" size="sm" weight={600} />,
  },
};

const positionStyles = {
  'top-left': 'absolute top-1.5 md:top-3 left-1.5 md:left-3',
  'top-right': 'absolute top-1.5 md:top-3 right-1.5 md:right-3',
  'bottom-left': 'absolute bottom-1.5 md:bottom-3 left-1.5 md:left-3',
  'bottom-right': 'absolute bottom-1.5 md:bottom-3 right-1.5 md:right-3',
  inline: '',
};

export function StatusBadge({ status, position = 'inline', size = 'md', icon }: StatusBadgeProps) {
  const config = statusConfig[status];
  if (!config) {
    return null;
  }

  const baseStyles =
    'z-10 flex items-center gap-1 rounded-full border leading-none font-semibold shadow-sm backdrop-blur-sm';

  return (
    <div
      className={`${baseStyles} ${config.bg} ${config.border} ${config.text} ${statusBadgeSizes[size]} ${positionStyles[position]}`}
    >
      <span className="inline-flex h-[1.125rem] w-[1.125rem] items-center justify-center">
        {icon ?? config.icon}
      </span>
      <span>{config.label}</span>
    </div>
  );
}
