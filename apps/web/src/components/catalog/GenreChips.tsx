import { unifiedGenres, type GenreKey } from '@findarr/shared/constants';
import { objectEntries } from '@findarr/shared/utils';

import { Badge } from '../ui/Badge';
import { Icon } from '../ui/Icon';

interface GenreChipsProps {
  selectedGenres: GenreKey[];
  onGenreChange: (genres: GenreKey[]) => void;
  disabled?: boolean;
}

export function GenreChips({ selectedGenres, onGenreChange, disabled = false }: GenreChipsProps) {
  const handleGenreToggle = (genreKey: GenreKey) => {
    const updatedKeys = selectedGenres.includes(genreKey)
      ? selectedGenres.filter((k) => k !== genreKey)
      : [...selectedGenres, genreKey];

    onGenreChange(updatedKeys);
  };

  const clearAllGenres = () => {
    onGenreChange([]);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-300">
          Genres {selectedGenres.length > 0 && `(${selectedGenres.length})`}
        </label>
        <button
          type="button"
          onClick={clearAllGenres}
          disabled={disabled || selectedGenres.length === 0}
          aria-hidden={selectedGenres.length === 0}
          tabIndex={selectedGenres.length === 0 ? -1 : 0}
          className={`inline-flex min-h-8 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100 disabled:cursor-not-allowed ${
            selectedGenres.length === 0 ? 'pointer-events-none invisible opacity-0' : 'opacity-100'
          } ${disabled ? 'opacity-50' : ''}`}
        >
          Clear all
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {objectEntries(unifiedGenres).map(([key, genre]) => {
          const isSelected = selectedGenres.includes(key);
          return (
            <Badge
              key={key}
              variant="secondary"
              selected={isSelected}
              interactive
              onClick={() => {
                if (!disabled) {
                  handleGenreToggle(key);
                }
              }}
              className={`px-3 py-1.5 text-xs shadow-none backdrop-blur-none ${
                isSelected
                  ? 'border-amber-400/45 bg-amber-400/12 text-amber-100 hover:border-amber-300/60 hover:bg-amber-400/16 hover:text-amber-50'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100'
              } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <span>{genre.name}</span>
              <span className="flex h-3 w-3 items-center justify-center">
                <Icon
                  className={`transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0'}`}
                  name="check"
                  size="xs"
                />
              </span>
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
