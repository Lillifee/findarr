import type { GenreKey } from '@findarr/shared/constants';
import type { InteractionFilter } from '@findarr/shared/interaction';
import type { SearchType } from '@findarr/shared/media';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { OptionButton } from '../ui/OptionButton';
import { GenreChips } from './GenreChips';
import { MediaTypeChips } from './MediaTypeChips';

const panelSectionClass = 'rounded-xl border border-gray-700/50 bg-gray-800/70 p-4';

const interactionOptions: {
  value: InteractionFilter;
  label: string;
  description: string;
}[] = [
  {
    value: 'all',
    label: 'All media',
    description: 'Mix together titles you have and have not voted on.',
  },
  {
    value: 'unvoted',
    label: 'Unvoted only',
    description: 'Keep the feed focused on titles you still need to rate.',
  },
  {
    value: 'voted',
    label: 'Voted only',
    description: 'Review titles you already liked or disliked.',
  },
];

interface FiltersToolbarProps {
  selectedType: SearchType;
  onTypeChange: (type: SearchType) => void;
  disabled?: boolean;

  selectedGenres?: GenreKey[];
  onGenresChange?: (genres: GenreKey[]) => void;

  showInteractionFilter?: boolean;
  interactionFilter?: InteractionFilter;
  onInteractionFilterChange?: (value: InteractionFilter) => void;

  showFiltersButton?: boolean;
  showGenreFilter?: boolean;
  filterDescription?: string;
  extraFiltersContent?: ReactNode;
}

function CheckIndicator({ selected }: { selected: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
        selected
          ? 'border-gray-500 bg-gray-200/90 text-gray-900'
          : 'border-gray-600/70 bg-transparent text-transparent'
      }`}
    >
      ✓
    </span>
  );
}

interface FilterPanelProps {
  description: string;
  children: ReactNode;
  onClose: () => void;
}

function FilterPanel({ description, children, onClose }: FilterPanelProps) {
  return (
    <>
      <div
        className="animate-in fade-in fixed inset-0 z-1000 cursor-pointer bg-black/60 duration-200"
        onClick={onClose}
      />

      <div className="animate-in slide-in-from-top-4 fixed top-8 right-0 left-0 z-1010 mx-4 max-w-7xl duration-200 md:right-0 md:left-64 md:mx-8 md:mr-auto md:ml-auto">
        <div className="flex max-h-[calc(100dvh-3rem)] flex-col overflow-hidden rounded-xl border border-gray-700/50 bg-gray-800/92 shadow-2xl backdrop-blur-md">
          <div className="shrink-0 border-b border-gray-700/50 px-4 py-4 md:px-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Filters</h3>
                <p className="mt-1 text-sm text-gray-500">{description}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-700/50 bg-gray-800/70 px-3 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:border-gray-500 hover:bg-gray-700/80 hover:text-white"
              >
                Close
                <span aria-hidden>x</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4 overflow-y-auto overscroll-contain p-4 md:p-5">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

interface InteractionFilterSectionProps {
  disabled: boolean;
  value: InteractionFilter;
  onChange: (value: InteractionFilter) => void;
}

function InteractionFilterSection({ disabled, value, onChange }: InteractionFilterSectionProps) {
  return (
    <div className={panelSectionClass}>
      <h4 className="mb-2.5 text-sm font-semibold text-white">Voting status</h4>

      <div className="grid gap-2.5 md:grid-cols-3">
        {interactionOptions.map((option) => {
          const selected = value === option.value;

          return (
            <OptionButton
              key={option.value}
              disabled={disabled}
              onClick={() => {
                onChange(option.value);
              }}
              selected={selected}
              title={option.label}
              description={option.description}
              icon={<CheckIndicator selected={selected} />}
              className={disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
            />
          );
        })}
      </div>
    </div>
  );
}

const emptyGenres: GenreKey[] = [];

export function FiltersToolbar({
  selectedType,
  onTypeChange,
  disabled = false,
  selectedGenres = emptyGenres,
  onGenresChange,
  showInteractionFilter = false,
  interactionFilter,
  onInteractionFilterChange,
  showFiltersButton = true,
  showGenreFilter = true,
  filterDescription = 'Adjust genres and voting status.',
  extraFiltersContent,
}: FiltersToolbarProps) {
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const interactionFilterSection =
    showInteractionFilter && interactionFilter && onInteractionFilterChange ? (
      <InteractionFilterSection
        disabled={disabled}
        value={interactionFilter}
        onChange={onInteractionFilterChange}
      />
    ) : null;

  const genreFilterSection =
    showGenreFilter && onGenresChange ? (
      <div className={panelSectionClass}>
        <GenreChips
          selectedGenres={selectedGenres}
          onGenreChange={onGenresChange}
          disabled={disabled}
        />
      </div>
    ) : null;

  const hasFilterContent =
    Boolean(interactionFilterSection) ||
    Boolean(extraFiltersContent) ||
    Boolean(genreFilterSection);
  const showFilterTrigger = showFiltersButton && hasFilterContent;

  useEffect(() => {
    if (!showFilterTrigger && filtersExpanded) {
      setFiltersExpanded(false);
    }
  }, [filtersExpanded, showFilterTrigger]);

  const closeFilters = () => {
    setFiltersExpanded(false);
  };

  const filterButton = showFilterTrigger ? (
    <button
      type="button"
      onClick={() => {
        setFiltersExpanded((current) => !current);
      }}
      aria-expanded={filtersExpanded}
      className="ml-auto inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-700/50 bg-gray-800/70 px-3.5 py-2 text-sm font-medium whitespace-nowrap text-gray-200 backdrop-blur-sm transition-colors hover:border-gray-500 hover:bg-gray-700/80 hover:text-white"
    >
      Filters
      <span
        className={`text-sm transition-transform duration-200 ${filtersExpanded ? 'rotate-180' : ''}`}
      >
        ▼
      </span>
    </button>
  ) : null;

  return (
    <div className="flex w-full shrink-0 items-center gap-3 md:w-auto">
      <MediaTypeChips selectedType={selectedType} onChange={onTypeChange} disabled={disabled} />
      {filterButton}

      {filtersExpanded &&
        createPortal(
          <FilterPanel description={filterDescription} onClose={closeFilters}>
            {interactionFilterSection}
            {extraFiltersContent}
            {genreFilterSection}
          </FilterPanel>,
          document.body,
        )}
    </div>
  );
}
