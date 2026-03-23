import { objectEntries, unifiedGenres } from '@findarr/shared';
import type { GenreKey } from '../../../shared/src/constants';

interface GenreChipsProps {
  selectedGenres: GenreKey[];
  onGenreChange: (genres: GenreKey[]) => void;
  disabled?: boolean;
}

export const GenreChips: React.FC<GenreChipsProps> = ({
  selectedGenres,
  onGenreChange,
  disabled = false,
}) => {
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
          <button
            type="button"
            onClick={clearAllGenres}
            disabled={disabled}
            className="text-xs text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {objectEntries(unifiedGenres).map(([key, genre]) => {
          const isSelected = selectedGenres.includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleGenreToggle(key)}
              disabled={disabled}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-linear-to-r from-amber-600 to-orange-600 text-white border-2 border-amber-400 shadow-md'
                  : 'bg-gray-800/60 backdrop-blur-sm text-gray-300 border-2 border-gray-600/50 hover:bg-gray-700/80 hover:border-gray-500'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span>{genre.name}</span>
              <svg
                className={`w-3 h-3 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0'}`}
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
            </button>
          );
        })}
      </div>
    </div>
  );
};
