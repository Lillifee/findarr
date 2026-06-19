import type { GenreKey } from '@findarr/shared/constants';
import type { InteractionFilter } from '@findarr/shared/interaction';
import type { SearchType } from '@findarr/shared/media';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { OptionButton } from '../ui/OptionButton';
import { PanelSection } from '../ui/PanelSection';
import { controlSurface } from '../ui/theme';
import { GenreChips } from './GenreChips';
import { MediaTypeChips } from './MediaTypeChips';

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

interface FilterPanelProps {
  description: string;
  children: ReactNode;
  onClose: () => void;
}

function FilterPanel({ description, children, onClose }: FilterPanelProps) {
  const { t } = useTranslation();
  return (
    <>
      <div
        className="animate-in fade-in fixed inset-0 z-[1000] cursor-pointer bg-black/60 duration-200"
        onClick={onClose}
      />

      <div className="animate-in slide-in-from-top-4 fixed top-8 right-0 left-0 z-[1010] mx-4 max-w-7xl duration-200 md:right-0 md:left-64 md:mx-8 md:mr-auto md:ml-auto">
        <div className="flex max-h-[calc(100dvh-3rem)] flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <div className="shrink-0 border-b border-zinc-800 px-4 py-4 md:px-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{t('catalog.filters')}</h3>
                <p className="mt-1 text-sm text-gray-500">{description}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100"
              >
                {t('common.close')}
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
  const { t } = useTranslation();

  const options = [
    {
      value: 'all' as InteractionFilter,
      label: t('catalog.interactionFilter.all'),
      description: t('catalog.interactionFilter.allDesc'),
    },
    {
      value: 'unvoted' as InteractionFilter,
      label: t('catalog.interactionFilter.unvoted'),
      description: t('catalog.interactionFilter.unvotedDesc'),
    },
    {
      value: 'voted' as InteractionFilter,
      label: t('catalog.interactionFilter.voted'),
      description: t('catalog.interactionFilter.votedDesc'),
    },
  ];

  return (
    <PanelSection>
      <h4 className="mb-2.5 text-sm font-semibold text-white">{t('common.votingStatus')}</h4>

      <div className="grid gap-2.5 md:grid-cols-3">
        {options.map((option) => {
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
              className={disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
            />
          );
        })}
      </div>
    </PanelSection>
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
  filterDescription,
  extraFiltersContent,
}: FiltersToolbarProps) {
  const { t } = useTranslation();
  const resolvedFilterDescription = filterDescription ?? t('catalog.filtersDefaultDescription');
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
      <PanelSection>
        <GenreChips
          selectedGenres={selectedGenres}
          onGenreChange={onGenresChange}
          disabled={disabled}
        />
      </PanelSection>
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
      className={`ml-auto inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium whitespace-nowrap ${controlSurface}`}
    >
      {t('catalog.filters')}
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
          <FilterPanel description={resolvedFilterDescription} onClose={closeFilters}>
            {interactionFilterSection}
            {extraFiltersContent}
            {genreFilterSection}
          </FilterPanel>,
          document.body,
        )}
    </div>
  );
}
