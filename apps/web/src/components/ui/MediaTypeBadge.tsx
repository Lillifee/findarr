import type { MediaType } from '@findarr/shared/media';

import { Icon } from './Icon';

interface MediaTypeBadgeProps {
  type: MediaType;
}

const typeConfig = {
  movie: {
    icon: <Icon name="movie" size="sm" />,
    label: 'Movie',
  },
  tv: {
    icon: <Icon name="tv" size="sm" />,
    label: 'TV',
  },
};

export function MediaTypeBadge({ type }: MediaTypeBadgeProps) {
  const config = typeConfig[type];

  return (
    <div className="z-10 flex max-w-full items-center gap-1 overflow-hidden rounded-full border border-zinc-700/80 bg-zinc-950/75 px-2 py-0.5 text-xs leading-none font-semibold text-zinc-100 shadow-sm backdrop-blur-sm md:px-2.5 md:py-1">
      <span className="inline-flex h-[1.125rem] w-[1.125rem] items-center justify-center text-zinc-300">
        {config.icon}
      </span>
      <span className="truncate @max-[72px]:hidden">{config.label}</span>
    </div>
  );
}
