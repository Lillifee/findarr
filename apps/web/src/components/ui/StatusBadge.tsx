import type { ReactNode } from 'react';

import { statusBadgeSizes, type Size } from './sizes';

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
    icon: (
      <svg className="h-3 w-3 md:h-4 md:w-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  downloaded: {
    bg: 'bg-cyan-500/88',
    border: 'border-cyan-300/35',
    text: 'text-white',
    label: 'Downloaded',
    icon: (
      <svg className="h-3 w-3 md:h-4 md:w-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  downloading: {
    bg: 'bg-blue-500/88',
    border: 'border-blue-300/35',
    text: 'text-white',
    label: 'Downloading',
    icon: (
      <div className="h-3 w-3 animate-spin rounded-full border-b-2 border-white md:h-4 md:w-4" />
    ),
  },
  monitored: {
    bg: 'bg-indigo-500/88',
    border: 'border-indigo-300/35',
    text: 'text-white',
    label: 'Monitored',
    icon: (
      <svg className="h-3 w-3 md:h-4 md:w-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.707a1 1 0 00-1.414-1.414L9 10.172 7.707 8.879a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  requested: {
    bg: 'bg-amber-500/90',
    border: 'border-amber-300/35',
    text: 'text-white',
    label: 'Requested',
    icon: (
      <svg className="h-3 w-3 md:h-4 md:w-4" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
      </svg>
    ),
  },
  warning: {
    bg: 'bg-orange-500/90',
    border: 'border-orange-300/35',
    text: 'text-white',
    label: 'Warning',
    icon: (
      <svg className="h-3 w-3 md:h-4 md:w-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    ),
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
    'z-10 flex items-center gap-1 rounded-full border font-semibold shadow-sm backdrop-blur-sm';

  return (
    <div
      className={`${baseStyles} ${config.bg} ${config.border} ${config.text} ${statusBadgeSizes[size]} ${positionStyles[position]}`}
    >
      {icon ?? config.icon}
      <span>{config.label}</span>
    </div>
  );
}
