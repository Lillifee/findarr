import { objectEntries, unifiedGenres } from '@findarr/shared';
import { useState } from 'react';
import type { GenreKey } from '../../../shared/src/constants';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { OptionButton } from './ui/OptionButton';

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
        <Button
          onClick={() => setIsOpen(!isOpen)}
          variant="secondary"
          className="w-full justify-between px-3.5 py-2 text-left text-sm"
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
        </Button>

        {isOpen && (
          <Card
            variant="solid"
            padding="none"
            className="absolute top-full left-0 right-0 z-1000 mt-1 max-h-72 overflow-y-auto"
          >
            <div className="border-b border-gray-700/50 px-3 py-2">
              <Button
                type="button"
                onClick={clearAllGenres}
                variant="ghost"
                size="sm"
                className="px-0"
              >
                Clear all
              </Button>
            </div>
            {objectEntries(unifiedGenres).map(([key, genre]) => {
              const isSelected = selectedGenres.includes(key);
              return (
                <OptionButton
                  key={key}
                  onClick={() => handleGenreToggle(key)}
                  selected={isSelected}
                  title={genre.name}
                  icon={isSelected ? <span className="text-base text-gray-900">✓</span> : undefined}
                  className="rounded-none border-x-0 border-t-0 border-b border-gray-700/50 first:border-t-0"
                />
              );
            })}
          </Card>
        )}
      </div>
    </div>
  );
}
