import type { SearchType } from '@findarr/shared/media';

import { Icon, type IconName } from '../ui/Icon';

interface MediaTypeChipsProps {
  selectedType: SearchType;
  onChange: (type: SearchType) => void;
  disabled?: boolean;
}

const types: { value: SearchType; label: string }[] = [
  { value: 'both', label: 'All' },
  { value: 'movie', label: 'Movies' },
  { value: 'tv', label: 'Shows' },
];

const icons: Record<SearchType, IconName> = {
  both: 'grid_view',
  movie: 'movie',
  tv: 'tv',
};

export function MediaTypeChips({ selectedType, onChange, disabled = false }: MediaTypeChipsProps) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg bg-zinc-900 text-zinc-200 ring-1 ring-zinc-800 ring-inset">
      {types.map((type, index) => (
        <button
          key={type.value}
          type="button"
          aria-pressed={selectedType === type.value}
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              onChange(type.value);
            }
          }}
          className={`inline-flex min-h-10 items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
            selectedType === type.value
              ? 'bg-amber-400/12 text-amber-100 ring-1 ring-amber-400/45 ring-inset hover:bg-amber-400/16 hover:text-amber-50'
              : 'bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
          } ${index === 0 ? 'rounded-l-lg' : ''} ${index === types.length - 1 ? 'rounded-r-lg' : ''} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
          title={type.label}
        >
          <Icon name={icons[type.value]} size="sm" />
          <span className="max-[460px]:hidden">{type.label}</span>
        </button>
      ))}
    </div>
  );
}
