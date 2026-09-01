import type { DiscoveryType } from '../../utils/catalogSearchParams';
import { Icon } from '../ui/Icon';

interface DiscoveryTagProps {
  type: DiscoveryType;
  name: string;
  onClick: () => void;
}

const discoveryIcons = {
  genre: 'theater_comedy',
  keyword: 'sell',
  person: 'person',
} as const;

export function DiscoveryTag({ type, name, onClick }: DiscoveryTagProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800/80 bg-zinc-950/72 px-2.5 py-1.5 text-xs text-zinc-200 backdrop-blur-sm transition-colors hover:border-amber-500/60 hover:text-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
    >
      <Icon name={discoveryIcons[type]} size="xs" />
      <span className="max-w-40 truncate">{name}</span>
    </button>
  );
}
