import { type RegionGroupId } from '@findarr/shared';
import React from 'react';

// Region metadata for UI display (TMDB mapping handled server-side)
const REGION_INFO: Record<RegionGroupId, { name: string; description: string }> = {
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
        <label className="text-sm font-medium text-gray-400">Content Regions</label>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleShowAll}
            disabled={disabled || isShowingAll}
            className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white border-none rounded disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
          >
            All
          </button>
          <button
            type="button"
            onClick={handleHideAll}
            disabled={disabled || isShowingNone}
            className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white border-none rounded disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
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
            <button
              key={regionId}
              type="button"
              onClick={() => handleRegionToggle(regionId)}
              disabled={disabled}
              className={`p-3 border-2 rounded-lg text-left disabled:cursor-not-allowed disabled:opacity-60 transition-all duration-200 ${
                isSelected
                  ? 'border-green-500 bg-green-600/20 hover:bg-green-600/30'
                  : 'border-gray-600 bg-gray-800 hover:bg-gray-700 hover:border-gray-500'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className={`w-3 h-3 rounded-full shrink-0 ${isSelected ? 'bg-green-500' : 'bg-gray-600'}`}
                />
                <span
                  className={`font-semibold text-sm ${isSelected ? 'text-green-200' : 'text-gray-200'}`}
                >
                  {region.name}
                </span>
              </div>
              <div
                className={`text-xs leading-tight ml-5 ${isSelected ? 'text-green-300' : 'text-gray-400'}`}
              >
                {region.description}
              </div>
            </button>
          );
        })}
      </div>

      {selectedRegions.length > 0 && selectedRegions.length < allRegions.length && (
        <div className="text-xs text-gray-400 text-center italic">
          Showing {selectedRegions.length} of {allRegions.length} content regions
        </div>
      )}
    </div>
  );
};
