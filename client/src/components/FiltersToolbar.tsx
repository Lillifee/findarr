import type { GenreKey, InteractionFilter, RegionGroupId, SearchType } from '@findarr/shared';
import { useState } from 'react';
import { GenreChips } from './GenreChips';
import { MediaTypeChips } from './MediaTypeChips';
import { RegionChips } from './RegionChips';
import { TimeRangeSlider } from './TimeRangeSlider';

interface FiltersToolbarProps {
  selectedType: SearchType;
  onTypeChange: (type: SearchType) => void;
  disabled?: boolean;

  selectedGenres: GenreKey[];
  onGenresChange: (genres: GenreKey[]) => void;

  language: string;
  onLanguageChange: (language: string) => void;

  selectedRegions: RegionGroupId[];
  onRegionsChange: (regions: RegionGroupId[]) => void;

  showTimeRange?: boolean;
  timeRangeDays?: number;
  onTimeRangeChange?: (days: number) => void;

  showInteractionFilter?: boolean;
  interactionFilter?: InteractionFilter;
  onInteractionFilterChange?: (value: InteractionFilter) => void;
}

export function FiltersToolbar({
  selectedType,
  onTypeChange,
  disabled = false,
  selectedGenres,
  onGenresChange,
  language,
  onLanguageChange,
  selectedRegions,
  onRegionsChange,
  showTimeRange = false,
  timeRangeDays,
  onTimeRangeChange,
  showInteractionFilter = false,
  interactionFilter,
  onInteractionFilterChange,
}: FiltersToolbarProps) {
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  return (
    <>
      <div className="sticky top-0 z-30 bg-gray-800/90 backdrop-blur-md border-b border-gray-700/50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3">
          <div className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <MediaTypeChips
              selectedType={selectedType}
              onChange={onTypeChange}
              disabled={disabled}
            />

            {showInteractionFilter && interactionFilter && onInteractionFilterChange && (
              <div className="flex items-center gap-2 min-w-0">
                <select
                  value={interactionFilter}
                  onChange={e => onInteractionFilterChange(e.target.value as InteractionFilter)}
                  disabled={disabled}
                  className="min-w-44 px-3 py-2 text-sm border border-gray-700/50 rounded-lg bg-gray-800/60 backdrop-blur-sm text-white hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <option value="all">All Media</option>
                  <option value="unvoted">Unvoted Only</option>
                  <option value="voted">Voted Only</option>
                </select>
              </div>
            )}

            <button
              onClick={() => setFiltersExpanded(current => !current)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-700/80 transition-all cursor-pointer whitespace-nowrap shadow-md"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                />
              </svg>
              <span>Filters</span>
              {!filtersExpanded && (
                <span className="hidden md:inline text-xs font-normal text-gray-400">
                  (
                  {selectedGenres.length > 0 &&
                    `${selectedGenres.length} genre${selectedGenres.length === 1 ? '' : 's'}`}
                  {selectedGenres.length > 0 && selectedRegions.length > 0 && ', '}
                  {selectedRegions.length > 0 &&
                    `${selectedRegions.length} region${selectedRegions.length === 1 ? '' : 's'}`}
                  {selectedGenres.length === 0 && selectedRegions.length === 0 && 'None'})
                </span>
              )}
              <span
                className="text-sm transition-transform duration-200"
                style={{
                  transform: filtersExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              >
                ▼
              </span>
            </button>
          </div>
        </div>
      </div>

      {filtersExpanded && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40 animate-in fade-in duration-200"
            onClick={() => setFiltersExpanded(false)}
          />

          <div className="fixed top-16 left-0 right-0 md:left-64 md:right-0 z-50 mx-4 md:mx-8 max-w-7xl md:ml-auto md:mr-auto animate-in slide-in-from-top-4 duration-200">
            <div className="bg-gray-800/95 backdrop-blur-md border border-gray-700/50 rounded-lg shadow-2xl overflow-hidden">
              <div className="flex justify-end p-2 border-b border-gray-700/50">
                <button
                  onClick={() => setFiltersExpanded(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white hover:bg-gray-700/60 rounded-md transition-all cursor-pointer"
                >
                  <span>Close</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="p-3 md:p-4">
                <div className="flex flex-col gap-4">
                  <GenreChips
                    selectedGenres={selectedGenres}
                    onGenreChange={onGenresChange}
                    disabled={disabled}
                  />

                  {showTimeRange && typeof timeRangeDays === 'number' && onTimeRangeChange && (
                    <TimeRangeSlider value={timeRangeDays} onChange={onTimeRangeChange} />
                  )}

                  <div className="flex flex-col gap-2 w-full">
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                        />
                      </svg>
                      <span>Language</span>
                    </label>
                    <select
                      value={language}
                      onChange={e => onLanguageChange(e.target.value)}
                      disabled={disabled}
                      className="w-full px-3 py-3 text-base border-2 border-gray-600 rounded-lg bg-gray-800/60 backdrop-blur-sm text-white hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <option value="de-DE">German (Germany)</option>
                      <option value="en-US">English (US)</option>
                      <option value="en-GB">English (UK)</option>
                      <option value="fr-FR">French (France)</option>
                      <option value="es-ES">Spanish (Spain)</option>
                      <option value="it-IT">Italian (Italy)</option>
                      <option value="nl-NL">Dutch (Netherlands)</option>
                      <option value="pt-BR">Portuguese (Brazil)</option>
                    </select>
                  </div>

                  <RegionChips
                    selectedRegions={selectedRegions}
                    onRegionsChange={onRegionsChange}
                    disabled={disabled}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
