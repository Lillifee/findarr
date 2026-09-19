import type { Genre, Keyword, Media, Person } from '@findarr/shared/media';
import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';

import type { DiscoveryFilter } from '../../utils/catalogSearchParams';
import { Icon } from '../ui/Icon';
import { PopupPanel } from '../ui/PopupPanel';
import { discoveryIcons } from './discoveryTagConfig';
import { discoveryTagClassName } from './discoveryTagStyles';
import { SearchMatches } from './SearchMatches';

export interface SearchData {
  genres: Genre[];
  keywords: Keyword[];
  people: Person[];
  results: Media[];
  loading: boolean;
}

interface SearchBarProps {
  initialQuery?: string;
  hasSearched?: boolean;
  discovery?: DiscoveryFilter[];
  suggestions?: SearchData;
  showPeople?: boolean;
  onSearch: (query: string) => void;
  onSearchPreview?: (query: string) => void;
  onSubmitSearch?: (query: string) => void;
  onClear?: () => void;
  onRemoveDiscovery?: (index: number) => void;
  onSelectGenre?: (genre: Genre) => void;
  onSelectKeyword?: (keyword: Keyword) => void;
  onSelectPerson?: (person: Person) => void;
  onSelectMedia?: (media: Media) => void;
}

const searchDebounceMs = 350;
const emptyDiscovery: DiscoveryFilter[] = [];

export function SearchBar({
  initialQuery = '',
  hasSearched = false,
  discovery = emptyDiscovery,
  suggestions,
  showPeople = true,
  onSearch,
  onSearchPreview,
  onSubmitSearch,
  onClear,
  onRemoveDiscovery,
  onSelectGenre,
  onSelectKeyword,
  onSelectPerson,
  onSelectMedia,
}: SearchBarProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState(initialQuery);
  const [panelOpen, setPanelOpen] = useState(false);
  const [mobilePanelTop, setMobilePanelTop] = useState<number | null>(null);
  const pendingSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputFocusedRef = useRef(false);
  const canClear = Boolean(query || hasSearched || discovery.length > 0);
  const activeData = suggestions;

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const { target } = event;
      if (panelOpen && target instanceof Node && formRef.current?.contains(target) !== true) {
        setPanelOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (panelOpen && event.key === 'Escape') {
        setPanelOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [panelOpen]);

  useEffect(() => {
    if (!panelOpen) {
      return () => {};
    }

    const updateMobilePanelTop = () => {
      const form = formRef.current;
      if (form) {
        setMobilePanelTop(form.getBoundingClientRect().bottom + 8);
      }
    };

    updateMobilePanelTop();
    const observer = new ResizeObserver(updateMobilePanelTop);
    if (formRef.current) {
      observer.observe(formRef.current);
    }
    window.addEventListener('resize', updateMobilePanelTop);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateMobilePanelTop);
    };
  }, [panelOpen, discovery.length]);

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

  const handleDiscoverySelect = () => {
    clearTimeout(pendingSearchRef.current ?? undefined);
    setQuery('');
    onSearchPreview?.('');
    setPanelOpen(false);
  };

  const handleChange = (value: string) => {
    setQuery(value);
    onSearchPreview?.(value);
    clearTimeout(pendingSearchRef.current ?? undefined);
    if (!onSearchPreview) {
      pendingSearchRef.current = setTimeout(() => {
        const trimmedQuery = value.trim();
        if (trimmedQuery) {
          onSearch(trimmedQuery);
        } else if (hasSearched) {
          onSearch('');
        }
      }, searchDebounceMs);
    }
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
    setPanelOpen(false);
    inputRef.current?.blur();
    onSubmitSearch?.(trimmedQuery);
    if (!onSubmitSearch) {
      onSearch(trimmedQuery);
    }
  };

  const clearButton = (
    <button
      type="button"
      onClick={handleClear}
      onMouseDown={(event) => {
        event.preventDefault();
      }}
      disabled={!canClear}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all ${
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
    <form ref={formRef} className="relative" onSubmit={handleSubmit}>
      <div className="box-border flex min-h-10 min-w-0 flex-wrap items-center gap-1 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 transition-colors focus-within:border-transparent focus-within:ring-2 focus-within:ring-amber-500 hover:border-zinc-700">
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          {discovery.map((filter, index) => (
            <span
              key={`${filter.type}-${filter.id}`}
              className={`${discoveryTagClassName} box-border h-7 max-w-full min-w-0 shrink py-1`}
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
        <div className="box-border flex max-w-full min-w-20 flex-1 items-center">
          <input
            ref={inputRef}
            type="text"
            value={query}
            aria-expanded={panelOpen}
            aria-haspopup="listbox"
            onMouseDown={() => {
              setPanelOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setPanelOpen(true);
              } else if (event.key === 'Escape') {
                event.preventDefault();
                setPanelOpen(false);
              }
            }}
            onFocus={() => {
              inputFocusedRef.current = true;
              setPanelOpen(true);
            }}
            onBlur={() => {
              inputFocusedRef.current = false;
            }}
            onChange={(event) => {
              handleChange(event.target.value);
            }}
            placeholder={t('catalog.searchPlaceholder')}
            className="min-w-0 flex-1 overflow-hidden bg-transparent px-2 py-1 text-sm text-ellipsis whitespace-nowrap text-white placeholder-zinc-400 outline-none"
          />
          {clearButton}
        </div>
      </div>
      {panelOpen && activeData && (
        <PopupPanel
          className="fixed inset-x-2 top-16 z-50 max-h-[calc(100vh-8rem)] min-h-96 overflow-x-hidden overflow-y-auto p-4 md:absolute md:inset-x-0 md:top-[calc(100%+0.5rem)]! md:max-h-[calc(100vh-7rem)] md:min-h-128"
          style={mobilePanelTop === null ? undefined : { top: `${mobilePanelTop}px` }}
        >
          {activeData.loading ? (
            <div className="flex min-h-24 items-center justify-center text-sm text-zinc-400">
              {t('common.loading')}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-3">
                {query.trim() ? (
                  <button
                    type="submit"
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-2 text-left text-sm text-white hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  >
                    <Icon name="search" size="sm" />
                    <span className="truncate">
                      {t('catalog.searchFor', { query: query.trim() })}
                    </span>
                  </button>
                ) : (
                  <span className="px-2 py-2 text-sm font-medium text-zinc-400">
                    {t('catalog.yourPreferences')}
                  </span>
                )}
                <button
                  type="button"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                  aria-label={t('catalog.closeSearch')}
                  onClick={() => {
                    setPanelOpen(false);
                  }}
                >
                  <Icon name="close" />
                </button>
              </div>
              <SearchMatches
                genres={activeData.genres}
                keywords={activeData.keywords}
                people={showPeople ? activeData.people : []}
                results={activeData.results}
                showPeople={showPeople}
                compact
                onSelectGenre={(genre) => {
                  handleDiscoverySelect();
                  onSelectGenre?.(genre);
                }}
                onSelectKeyword={(keyword) => {
                  handleDiscoverySelect();
                  onSelectKeyword?.(keyword);
                }}
                onSelectPerson={(person) => {
                  handleDiscoverySelect();
                  onSelectPerson?.(person);
                }}
                onSelectMedia={(media) => {
                  setPanelOpen(false);
                  onSelectMedia?.(media);
                }}
              />
              {activeData.genres.length === 0 &&
                activeData.keywords.length === 0 &&
                activeData.people.length === 0 && (
                  <p className="py-6 text-center text-sm text-zinc-400">{t('common.noResults')}</p>
                )}
            </div>
          )}
        </PopupPanel>
      )}
    </form>
  );
}
