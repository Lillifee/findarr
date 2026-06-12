import type { MediaType } from '@findarr/shared/media';

import { Icon } from './Icon';

interface MediaTypeBadgeProps {
  type: MediaType;
}

const typeConfig = {
  movie: {
    icon: <Icon name="movie" size="xs" />,
    label: 'Movie',
  },
  tv: {
    icon: <Icon name="tv" size="xs" />,
    label: 'TV',
  },
};

export function MediaTypeBadge({ type }: MediaTypeBadgeProps) {
  const config = typeConfig[type];

  return (
    <div className="absolute top-2 right-2 z-10 inline-flex items-center gap-1 rounded-full border border-zinc-700/80 bg-zinc-950/75 px-2 py-1 text-[11px] font-medium text-zinc-100 shadow-sm backdrop-blur-sm md:top-3 md:right-3">
      <span className="text-zinc-300">{config.icon}</span>
      <span>{config.label}</span>
    </div>
  );
}
