import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

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

  const handleClear = () => {
    setQuery('');
    if (onClear) {
      onClear();
    }
  };

  const clearButton = (
    <button
      type="button"
      onClick={handleClear}
      onMouseDown={event => event.preventDefault()}
      disabled={!canClear}
      className={`p-1.5 rounded-full transition-all ${
        canClear
          ? 'text-gray-400 hover:text-white hover:bg-gray-700/60 cursor-pointer'
          : 'text-transparent cursor-default pointer-events-none'
      }`}
      aria-label="Clear search"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
  );

  const searchIcon = loading ? (
    <svg
      className="animate-spin h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  ) : (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
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
