import type { SearchType } from '@findarr/shared/media';
import { useTranslation } from 'react-i18next';

import { Icon, type IconName } from '../ui/Icon';

interface MediaTypeChipsProps {
  selectedType: SearchType;
  onChange: (type: SearchType) => void;
  disabled?: boolean;
}

const icons: Record<SearchType, IconName> = {
  both: 'grid_view',
  movie: 'movie',
  tv: 'tv',
};

const typeKeys: Record<SearchType, string> = {
  both: 'catalog.typeAll',
  movie: 'catalog.typeMovies',
  tv: 'catalog.typeShows',
};

const typeValues: SearchType[] = ['both', 'movie', 'tv'];

export function MediaTypeChips({ selectedType, onChange, disabled = false }: MediaTypeChipsProps) {
  const { t } = useTranslation();
  return (
    <div className="inline-flex overflow-hidden rounded-lg bg-zinc-900 text-zinc-200 ring-1 ring-zinc-800 ring-inset">
      {typeValues.map((value, index) => {
        const label = t(typeKeys[value]);
        return (
          <button
            key={value}
            type="button"
            aria-pressed={selectedType === value}
            disabled={disabled}
            onClick={() => {
              if (!disabled) {
                onChange(value);
              }
            }}
            className={`inline-flex min-h-10 items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
              selectedType === value
                ? 'bg-amber-400/12 text-amber-100 ring-1 ring-amber-400/45 ring-inset hover:bg-amber-400/16 hover:text-amber-50'
                : 'bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
            } ${index === 0 ? 'rounded-l-lg' : ''} ${index === typeValues.length - 1 ? 'rounded-r-lg' : ''} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
            title={label}
          >
            <Icon name={icons[value]} size="sm" />
            <span className="max-[460px]:hidden">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
