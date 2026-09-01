import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';

import type { DiscoveryFilter } from '../../utils/catalogSearchParams';
import { Icon } from '../ui/Icon';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onClear?: () => void;
  hasSearched?: boolean;
  initialQuery?: string;
  discovery?: DiscoveryFilter[];
  onRemoveDiscovery?: (index: number) => void;
}

const searchDebounceMs = 350;
const emptyDiscovery: DiscoveryFilter[] = [];

const discoveryIcons = {
  genre: 'theater_comedy',
  keyword: 'sell',
  person: 'person',
} as const;

export function SearchBar({
  onSearch,
  onClear,
  hasSearched = false,
  initialQuery = '',
  discovery = emptyDiscovery,
  onRemoveDiscovery,
}: SearchBarProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState(initialQuery);
  const pendingSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputFocusedRef = useRef(false);
  const canClear = Boolean(query || hasSearched || discovery.length > 0);

  useEffect(() => {
    clearTimeout(pendingSearchRef.current ?? undefined);
    if (!inputFocusedRef.current) {
      setQuery(initialQuery);
    }
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
        onSearch('');
      }
    }, searchDebounceMs);
  };

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearTimeout(pendingSearchRef.current ?? undefined);

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      if (hasSearched) {
        onSearch('');
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
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all ${
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
      <div className="box-border flex min-h-10 min-w-0 flex-wrap items-center gap-1 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 transition-colors focus-within:border-transparent focus-within:ring-2 focus-within:ring-amber-500 hover:border-zinc-700">
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          {discovery.map((filter, index) => (
            <span
              key={`${filter.type}-${filter.id}`}
              className="flex max-w-full min-w-0 shrink items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs text-zinc-100"
            >
              <Icon name={discoveryIcons[filter.type]} size="xs" />
              <span className="min-w-0 flex-1 truncate">{filter.name}</span>
              <button
                type="button"
                onClick={() => onRemoveDiscovery?.(index)}
                aria-label={`Remove ${filter.name}`}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-zinc-400 hover:text-white"
              >
                <Icon name="close" />
              </button>
            </span>
          ))}
        </div>
        <div className="box-border flex max-w-full min-w-[5rem] flex-1 items-center">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onFocus={() => {
              inputFocusedRef.current = true;
            }}
            onBlur={() => {
              inputFocusedRef.current = false;
            }}
            onChange={(event) => {
              handleChange(event.target.value);
            }}
            placeholder={t('catalog.searchPlaceholder')}
            className="min-w-0 flex-1 overflow-hidden bg-transparent px-2 py-1.5 text-sm text-ellipsis whitespace-nowrap text-white placeholder-zinc-400 outline-none"
          />
          {clearButton}
        </div>
      </div>
    </form>
  );
}
