import { objectEntries, unifiedGenres } from '@findarr/shared';
import { useState } from 'react';
import type { GenreKey } from '../../../shared/src/constants';

interface Props {
  selectedGenres: GenreKey[];
  onGenreChange: (genres: GenreKey[]) => void;
}

export default function GenreSelector({ selectedGenres, onGenreChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);

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
      <label className="text-sm font-medium text-gray-400">
        Genres {selectedGenres.length > 0 && `(${selectedGenres.length} selected)`}
      </label>
      <div className="relative min-w-45">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-3 text-base border-2 border-gray-600 rounded-lg bg-gray-700 text-left cursor-pointer flex justify-between items-center hover:border-gray-500 transition-colors"
        >
          <span className={selectedGenres.length === 0 ? 'text-gray-400' : 'text-white'}>
            {selectedGenres.length === 0
              ? 'Select genres...'
              : `${selectedGenres.length} genre${selectedGenres.length === 1 ? '' : 's'} selected`}
          </span>
          <span
            className={`text-xl transition-transform duration-200 text-gray-400 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
          >
            ▼
          </span>
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border-2 border-gray-600 rounded-lg shadow-xl z-1000 max-h-60 overflow-y-auto">
            <div className="px-3 py-2 border-b border-gray-700 bg-gray-750">
              <button
                type="button"
                onClick={clearAllGenres}
                className="text-sm text-blue-400 hover:text-blue-300 bg-transparent border-none cursor-pointer p-0 transition-colors"
              >
                Clear all
              </button>
            </div>
            {objectEntries(unifiedGenres).map(([key, genre]) => {
              const isSelected = selectedGenres.includes(key);
              return (
                <div
                  key={key}
                  onClick={() => handleGenreToggle(key)}
                  className={`px-3 py-2 cursor-pointer flex items-center justify-between border-b border-gray-700 transition-colors ${
                    isSelected
                      ? 'bg-blue-600/30 hover:bg-blue-600/40'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  <span
                    className={`text-sm ${isSelected ? 'font-medium text-blue-200' : 'font-normal text-gray-300'}`}
                  >
                    {genre.name}
                  </span>
                  {isSelected && <span className="text-blue-400 text-base">✓</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
