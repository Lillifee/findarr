import { objectEntries, unifiedGenres } from '@findarr/shared';
import type { GenreKey } from '@findarr/shared';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

interface GenreChipsProps {
  selectedGenres: GenreKey[];
  onGenreChange: (genres: GenreKey[]) => void;
  disabled?: boolean;
}

export function GenreChips({ selectedGenres, onGenreChange, disabled = false }: GenreChipsProps) {
  const handleGenreToggle = (genreKey: GenreKey) => {
    const updatedKeys = selectedGenres.includes(genreKey)
      ? selectedGenres.filter(k => k !== genreKey)
      : [...selectedGenres, genreKey];

    onGenreChange(updatedKeys);
  };

  const clearAllGenres = () => {
    onGenreChange([]);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-300">
          Genres {selectedGenres.length > 0 && `(${selectedGenres.length})`}
        </label>
        {selectedGenres.length > 0 && (
          <Button
            type="button"
            onClick={clearAllGenres}
            disabled={disabled}
            variant="ghost"
            size="sm"
            className="text-xs text-amber-400 hover:text-amber-300"
          >
            Clear all
          </Button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {objectEntries(unifiedGenres).map(([key, genre]) => {
          const isSelected = selectedGenres.includes(key);
          return (
            <Badge
              key={key}
              variant="primary"
              selected={isSelected}
              interactive
              onClick={() => !disabled && handleGenreToggle(key)}
              className={disabled ? 'opacity-50 cursor-not-allowed' : ''}
            >
              <span>{genre.name}</span>
              {isSelected && (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
