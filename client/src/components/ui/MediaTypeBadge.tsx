interface MediaTypeBadgeProps {
  type: 'movie' | 'tv';
}

const typeConfig = {
  movie: {
    bg: 'bg-purple-500/80',
    text: 'text-purple-100',
    border: 'border-purple-400/50',
    label: 'Movie',
  },
  tv: {
    bg: 'bg-cyan-500/80',
    text: 'text-cyan-100',
    border: 'border-cyan-400/50',
    label: 'TV',
  },
};

export function MediaTypeBadge({ type }: MediaTypeBadgeProps) {
  const config = typeConfig[type];

  return (
    <div
      className={`absolute top-2 right-2 md:top-3 md:right-3 z-10 ${config.bg} ${config.text} text-[11px] font-semibold px-1.5 py-0.5 rounded backdrop-blur-sm border ${config.border} shadow-sm`}
    >
      {config.label}
    </div>
  );
}
