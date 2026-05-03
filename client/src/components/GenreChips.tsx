import { objectEntries, unifiedGenres } from '@findarr/shared';
import type { GenreKey } from '@findarr/shared';
import { Badge } from './ui/Badge';

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
        <button
          type="button"
          onClick={clearAllGenres}
          disabled={disabled || selectedGenres.length === 0}
          aria-hidden={selectedGenres.length === 0}
          tabIndex={selectedGenres.length === 0 ? -1 : 0}
          className={`inline-flex min-h-8 items-center justify-center rounded-full border border-gray-600/70 bg-gray-800/80 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-gray-400 hover:bg-gray-700/80 hover:text-white disabled:cursor-not-allowed ${
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
              onClick={() => !disabled && handleGenreToggle(key)}
              className={`px-3 py-1.5 text-xs shadow-none backdrop-blur-none ${
                isSelected
                  ? 'border-gray-400 bg-gray-300/90 text-gray-950 hover:border-gray-200 hover:bg-gray-200 hover:text-gray-950'
                  : 'border-gray-600/70 bg-gray-800/80 text-gray-200 hover:border-gray-400 hover:bg-gray-700/80 hover:text-white'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span>{genre.name}</span>
              <span className="flex h-3 w-3 items-center justify-center">
                <svg
                  className={`h-3 w-3 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </span>
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
