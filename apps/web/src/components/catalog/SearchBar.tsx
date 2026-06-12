import { useState, useEffect } from 'react';

import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Input } from '../ui/Input';
import { Spinner } from '../ui/Spinner';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onClear?: () => void;
  loading: boolean;
  hasSearched?: boolean;
  initialQuery?: string;
}

export function SearchBar({
  onSearch,
  onClear,
  loading,
  hasSearched = false,
  initialQuery = '',
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const canClear = Boolean(query || hasSearched);

  // Update local query when initialQuery changes
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const handleClear = () => {
    setQuery('');
    if (onClear) {
      onClear();
    }
  };

  const handleSubmit = (e: React.ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();

    // If query is empty and we're in search mode, clear the search
    if (!query.trim()) {
      if (hasSearched && onClear) {
        handleClear();
      }
      return;
    }

    onSearch(query.trim());
  };

  const clearButton = (
    <button
      type="button"
      onClick={handleClear}
      onMouseDown={(event) => {
        event.preventDefault();
      }}
      disabled={!canClear}
      className={`rounded-full p-1.5 transition-all ${
        canClear
          ? 'cursor-pointer text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
          : 'pointer-events-none cursor-default text-transparent'
      }`}
      aria-label="Clear search"
    >
      <Icon name="close" />
    </button>
  );

  const searchIcon = loading ? (
    <Spinner className="h-5 w-5 border-zinc-500" />
  ) : (
    <Icon name="search" />
  );

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            placeholder="Search movies or TV shows..."
            disabled={loading}
            variant="search"
            suffixIcon={clearButton}
            className="text-sm"
          />
        </div>

        <Button
          type="submit"
          disabled={loading || (!query.trim() && !hasSearched)}
          variant="secondary"
          aria-label="Search"
          className="min-h-10 shrink-0 rounded-lg px-3.5"
        >
          {searchIcon}
        </Button>
      </div>
    </form>
  );
}
