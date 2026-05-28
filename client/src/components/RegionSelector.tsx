import type { RegionGroupId } from '@findarr/shared';
import type React from 'react';
import { OptionButton } from './ui/OptionButton';

// Region metadata for UI display (TMDB mapping handled server-side)
const REGION_INFO: Record<
  RegionGroupId,
  { name: string; description: string }
> = {
  western: {
    name: 'Western',
    description:
      'English-speaking countries, Western Europe, and Nordic countries (US, UK, Germany, France, etc.)',
  },
  'eastern-europe': {
    name: 'Eastern Europe',
    description:
      'Eastern European countries including Russia, Poland, Czech Republic, and Baltic states',
  },
  asian: {
    name: 'Asian',
    description:
      'All Asian countries including Japan, Korea, China, India, Thailand, Indonesia, Philippines, etc.',
  },
  'latin-america': {
    name: 'Latin America',
    description:
      'Latin American countries including Mexico, Brazil, Argentina, Chile, Colombia, Peru, etc.',
  },
  'middle-east-africa': {
    name: 'Middle East & Africa',
    description:
      'Middle Eastern and African countries including Saudi Arabia, Turkey, Egypt, Nigeria, Kenya, etc.',
  },
};

interface RegionSelectorProps {
  selectedRegions: RegionGroupId[];
  onRegionsChange: (regions: RegionGroupId[]) => void;
  disabled?: boolean;
}

export const RegionSelector: React.FC<RegionSelectorProps> = ({
  selectedRegions,
  onRegionsChange,
  disabled = false,
}) => {
  const allRegions = Object.keys(REGION_INFO) as RegionGroupId[];

  const handleRegionToggle = (regionId: RegionGroupId) => {
    if (selectedRegions.includes(regionId)) {
      // Remove it
      onRegionsChange(selectedRegions.filter(id => id !== regionId));
    } else {
      // Add it
      onRegionsChange([...selectedRegions, regionId]);
    }
  };

  const handleShowAll = () => {
    onRegionsChange(allRegions);
  };

  const handleHideAll = () => {
    onRegionsChange([]);
  };

  const isShowingAll = selectedRegions.length === allRegions.length;
  const isShowingNone = selectedRegions.length === 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-400">
          Content Regions
        </label>

        <div className="flex gap-2">
          <button
            onClick={handleShowAll}
            type="button"
            disabled={disabled || isShowingAll}
            className={`inline-flex min-h-8 items-center justify-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              isShowingAll
                ? 'border-gray-400 bg-gray-300/90 text-gray-950'
                : 'border-gray-600/70 bg-gray-800/80 text-gray-300 hover:border-gray-400 hover:bg-gray-700/80 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={handleHideAll}
            type="button"
            disabled={disabled || isShowingNone}
            className={`inline-flex min-h-8 items-center justify-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              isShowingNone
                ? 'border-gray-400 bg-gray-300/90 text-gray-950'
                : 'border-gray-600/70 bg-gray-800/80 text-gray-300 hover:border-gray-400 hover:bg-gray-700/80 hover:text-white'
            }`}
          >
            None
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2">
        {allRegions.map(regionId => {
          const region = REGION_INFO[regionId];
          const isSelected = selectedRegions.includes(regionId);

          return (
            <OptionButton
              key={regionId}
              onClick={() => handleRegionToggle(regionId)}
              disabled={disabled}
              selected={isSelected}
              title={
                <span className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${isSelected ? 'bg-gray-900' : 'bg-gray-500'}`}
                  />
                  <span>{region.name}</span>
                </span>
              }
              description={region.description}
              className={disabled ? 'cursor-not-allowed opacity-60' : ''}
            />
          );
        })}
      </div>

      {selectedRegions.length > 0 &&
        selectedRegions.length < allRegions.length && (
          <div className="text-xs text-gray-400 text-center italic">
            Showing {selectedRegions.length} of {allRegions.length} content
            regions
          </div>
        )}
    </div>
  );
};
