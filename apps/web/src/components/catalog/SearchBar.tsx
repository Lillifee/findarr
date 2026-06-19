import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Input } from '../ui/Input';

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
  const { t } = useTranslation();
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
      className={`flex items-center justify-center rounded-full p-1.5 transition-all ${
        canClear
          ? 'cursor-pointer text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
          : 'pointer-events-none cursor-default text-transparent'
      }`}
      aria-label="Clear search"
    >
      <Icon name="close" />
    </button>
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
            placeholder={t('catalog.searchPlaceholder')}
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
          aria-label={t('catalog.filters')}
          className="min-h-10 shrink-0 rounded-lg px-3.5"
        >
          <Icon name="search" />
        </Button>
      </div>
    </form>
  );
}
