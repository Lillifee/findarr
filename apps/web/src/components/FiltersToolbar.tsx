import type { GenreKey } from '@findarr/shared/constants';
import type { InteractionFilter } from '@findarr/shared/interaction';
import type { SearchType } from '@findarr/shared/media';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { GenreChips } from './GenreChips';
import { MediaTypeChips } from './MediaTypeChips';
import { OptionButton } from './ui/OptionButton';

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

  selectedGenres: GenreKey[];
  onGenresChange: (genres: GenreKey[]) => void;

  showInteractionFilter?: boolean;
  interactionFilter?: InteractionFilter;
  onInteractionFilterChange?: (value: InteractionFilter) => void;

  showFiltersButton?: boolean;
  showGenreFilter?: boolean;
  filterDescription?: string;
  extraFiltersContent?: ReactNode;
  disableWrapper?: boolean;
}

export function FiltersToolbar({
  selectedType,
  onTypeChange,
  disabled = false,
  selectedGenres,
  onGenresChange,
  showInteractionFilter = false,
  interactionFilter,
  onInteractionFilterChange,
  showFiltersButton = true,
  showGenreFilter = true,
  filterDescription = 'Adjust genres and voting status.',
  extraFiltersContent,
  disableWrapper = false,
}: FiltersToolbarProps) {
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  useEffect(() => {
    if (!showFiltersButton && filtersExpanded) {
      setFiltersExpanded(false);
    }
  }, [filtersExpanded, showFiltersButton]);

  const filterButton = showFiltersButton ? (
    <button
      onClick={() => {
        setFiltersExpanded((current) => !current);
      }}
      className="ml-auto inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-700/50 bg-gray-800/70 px-3.5 py-2 text-sm font-medium whitespace-nowrap text-gray-200 backdrop-blur-sm transition-colors hover:border-gray-500 hover:bg-gray-700/80 hover:text-white"
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
        />
      </svg>
      <span>Filters</span>
      <span
        className="text-sm transition-transform duration-200"
        style={{
          transform: filtersExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
        }}
      >
        ▼
      </span>
    </button>
  ) : null;

  const filterPanel =
    showFiltersButton && filtersExpanded ? (
      <>
        <div
          className="animate-in fade-in fixed inset-0 z-40 cursor-pointer bg-black/60 duration-200"
          onClick={() => {
            setFiltersExpanded(false);
          }}
        />

        <div className="animate-in slide-in-from-top-4 fixed top-16 right-0 left-0 z-50 mx-4 max-w-7xl duration-200 md:right-0 md:left-64 md:mx-8 md:mr-auto md:ml-auto">
          <div className="overflow-hidden rounded-xl border border-gray-700/50 bg-gray-800/92 shadow-2xl backdrop-blur-md">
            <div className="border-b border-gray-700/50 px-4 py-4 md:px-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">Filters</h3>
                  <p className="mt-1 text-sm text-gray-500">{filterDescription}</p>
                </div>
                <button
                  onClick={() => {
                    setFiltersExpanded(false);
                  }}
                  className="flex cursor-pointer items-center gap-1.5 self-start rounded-lg border border-gray-700/50 bg-gray-800/70 px-3 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:border-gray-500 hover:bg-gray-700/80 hover:text-white"
                >
                  <span>Close</span>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-4 md:p-5">
              <div className="flex flex-col gap-4">
                {showInteractionFilter && interactionFilter && onInteractionFilterChange && (
                  <div className="rounded-xl border border-gray-700/50 bg-gray-800/70 p-4">
                    <div className="mb-2.5">
                      <h4 className="text-sm font-semibold text-white">Voting status</h4>
                    </div>

                    <div className="grid gap-2.5 md:grid-cols-3">
                      {interactionOptions.map((option) => {
                        const isSelected = interactionFilter === option.value;

                        return (
                          <OptionButton
                            key={option.value}
                            disabled={disabled}
                            onClick={() => {
                              onInteractionFilterChange(option.value);
                            }}
                            selected={isSelected}
                            title={option.label}
                            description={option.description}
                            icon={
                              <span
                                className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
                                  isSelected
                                    ? 'border-gray-500 bg-gray-200/90 text-gray-900'
                                    : 'border-gray-600/70 bg-transparent text-transparent'
                                }`}
                              >
                                ✓
                              </span>
                            }
                            className={
                              disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                            }
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {extraFiltersContent}

                {showGenreFilter && (
                  <div className="rounded-xl border border-gray-700/50 bg-gray-800/70 p-4">
                    <GenreChips
                      selectedGenres={selectedGenres}
                      onGenreChange={onGenresChange}
                      disabled={disabled}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    ) : null;

  if (disableWrapper) {
    return (
      <div className="flex w-full shrink-0 items-center gap-3 md:w-auto">
        <MediaTypeChips selectedType={selectedType} onChange={onTypeChange} disabled={disabled} />
        {filterButton}
        {filterPanel && createPortal(filterPanel, document.body)}
      </div>
    );
  }

  return (
    <>
      <div className="sticky top-0 z-30 border-b border-gray-700/50 bg-gray-800/90 shadow-2xl backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-3 md:px-8">
          <div className="flex w-full shrink-0 items-center gap-3 md:w-auto">
            <MediaTypeChips
              selectedType={selectedType}
              onChange={onTypeChange}
              disabled={disabled}
            />
            {filterButton}
          </div>
        </div>
      </div>
      {filterPanel}
    </>
  );
}
