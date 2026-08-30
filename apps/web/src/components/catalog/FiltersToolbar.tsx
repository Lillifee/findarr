import type { SearchType } from '@findarr/shared/media';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { Icon } from '../ui/Icon';
import { controlSurface } from '../ui/theme';
import { MediaTypeChips } from './MediaTypeChips';

interface FiltersToolbarProps {
  selectedType: SearchType;
  onTypeChange: (type: SearchType) => void;
  disabled?: boolean;
  showMediaType?: boolean;

  showFiltersButton?: boolean;
  extraFiltersContent?: ReactNode;
}

interface FilterPanelProps {
  children: ReactNode;
  onClose: () => void;
}

function FilterPanel({ children, onClose }: FilterPanelProps) {
  const { t } = useTranslation();
  return (
    <>
      <div
        className="animate-in fade-in fixed inset-0 z-1000 cursor-pointer bg-black/60 duration-200"
        onClick={onClose}
      />

      <div className="animate-in slide-in-from-top-4 fixed top-8 right-0 left-0 z-1010 mx-4 max-w-7xl duration-200 md:right-0 md:left-64 md:mx-8 md:mr-auto md:ml-auto">
        <div className="flex max-h-[calc(100dvh-3rem)] flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <div className="shrink-0 border-b border-zinc-800 px-4 py-4 md:px-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{t('catalog.filters')}</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100"
              >
                {t('common.close')}
                <span aria-hidden>{t('common.closeSymbol')}</span>
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

export function FiltersToolbar({
  selectedType,
  onTypeChange,
  disabled = false,
  showMediaType = true,
  showFiltersButton = true,
  extraFiltersContent,
}: FiltersToolbarProps) {
  const { t } = useTranslation();
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const hasFilterContent = Boolean(extraFiltersContent);

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
      aria-label={t('catalog.filters')}
      className={`ml-auto inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium whitespace-nowrap sm:px-3.5 ${controlSurface}`}
    >
      <Icon name="tune" size="sm" />
      <span className="max-[600px]:hidden">{t('catalog.filters')}</span>
      <span
        className={`text-sm transition-transform duration-200 max-[600px]:hidden ${filtersExpanded ? 'rotate-180' : ''}`}
      >
        {/* oxlint-disable-next-line react/jsx-no-literals */}▼
      </span>
    </button>
  ) : null;

  return (
    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
      {showMediaType && (
        <MediaTypeChips selectedType={selectedType} onChange={onTypeChange} disabled={disabled} />
      )}
      {filterButton}

      {filtersExpanded &&
        createPortal(
          <FilterPanel onClose={closeFilters}>{extraFiltersContent}</FilterPanel>,
          document.body,
        )}
    </div>
  );
}
