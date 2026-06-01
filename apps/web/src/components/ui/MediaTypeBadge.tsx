import type { MediaType } from '@findarr/shared';

interface MediaTypeBadgeProps {
  type: MediaType;
}

const typeConfig = {
  movie: {
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
        />
      </svg>
    ),
    label: 'Movie',
  },
  tv: {
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
    label: 'TV',
  },
};

export function MediaTypeBadge({ type }: MediaTypeBadgeProps) {
  const config = typeConfig[type];

  return (
    <div className="absolute top-2 right-2 z-10 inline-flex items-center gap-1 rounded-full border border-gray-600/70 bg-gray-900/72 px-2 py-1 text-[11px] font-medium text-gray-100 shadow-sm backdrop-blur-sm md:top-3 md:right-3">
      <span className="text-gray-300">{config.icon}</span>
      <span>{config.label}</span>
    </div>
  );
}
