import { isDefined, isNotEmpty } from '@findarr/shared/utils';

import { tmdbImage } from '../../utils/tmdb';
import { Icon, type IconName } from '../ui/Icon';

interface SuggestionTileProps {
  name: string;
  imagePath: string | undefined;
  subtitle?: string | undefined;
  containImage?: boolean;
  fallbackIcon: IconName;
  compact?: boolean;
  onClick: () => void;
}

export function SuggestionTile({
  name,
  imagePath,
  fallbackIcon,
  subtitle,
  containImage = false,
  compact = false,
  onClick,
}: SuggestionTileProps) {
  return (
    <button
      type="button"
      title={isNotEmpty(subtitle) ? `${name}: ${subtitle}` : name}
      onClick={onClick}
      className={`group shrink-0 self-start rounded-lg text-zinc-200 hover:text-amber-200 focus-visible:outline-amber-500 ${compact ? 'w-16' : 'w-24'}`}
    >
      <span className="mb-2 flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 group-hover:border-amber-500/70">
        {isDefined(imagePath) ? (
          <img
            src={tmdbImage(imagePath, 'w185')}
            alt=""
            className={`size-full ${containImage ? 'object-contain p-2' : 'object-cover'}`}
          />
        ) : (
          <Icon name={fallbackIcon} size="xl" className="text-zinc-500" />
        )}
      </span>
      <span className="block truncate text-xs font-medium">{name}</span>
      {isNotEmpty(subtitle) && (
        <span className="text-2xs block truncate text-zinc-400">{subtitle}</span>
      )}
    </button>
  );
}
