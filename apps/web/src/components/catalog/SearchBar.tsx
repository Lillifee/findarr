import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '../ui/Icon';
import { Input } from '../ui/Input';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onClear?: () => void;
  hasSearched?: boolean;
  initialQuery?: string;
}

const searchDebounceMs = 350;

export function SearchBar({
  onSearch,
  onClear,
  hasSearched = false,
  initialQuery = '',
}: SearchBarProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState(initialQuery);
  const pendingSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canClear = Boolean(query || hasSearched);

  useEffect(() => {
    clearTimeout(pendingSearchRef.current ?? undefined);
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(
    () => () => {
      clearTimeout(pendingSearchRef.current ?? undefined);
    },
    [],
  );

  const handleClear = () => {
    clearTimeout(pendingSearchRef.current ?? undefined);
    setQuery('');
    onClear?.();
  };

  const handleChange = (value: string) => {
    setQuery(value);
    clearTimeout(pendingSearchRef.current ?? undefined);

    pendingSearchRef.current = setTimeout(() => {
      const trimmedQuery = value.trim();

      if (trimmedQuery) {
        onSearch(trimmedQuery);
      } else if (hasSearched) {
        onClear?.();
      }
    }, searchDebounceMs);
  };

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearTimeout(pendingSearchRef.current ?? undefined);

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      if (hasSearched) {
        handleClear();
      }
      return;
    }

    onSearch(trimmedQuery);
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
      <Input
        type="text"
        value={query}
        onChange={(event) => {
          handleChange(event.target.value);
        }}
        placeholder={t('catalog.searchPlaceholder')}
        variant="search"
        suffixIcon={clearButton}
        className="text-sm"
      />
    </form>
  );
}
