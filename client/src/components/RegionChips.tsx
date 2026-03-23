import { type RegionGroupId } from '@findarr/shared';
import React from 'react';

// Region metadata for UI display (TMDB mapping handled server-side)
const REGION_INFO: Record<RegionGroupId, { name: string }> = {
  western: { name: 'Western' },
  'eastern-europe': { name: 'E. Europe' },
  asian: { name: 'Asian' },
  'latin-america': { name: 'Latin America' },
  'middle-east-africa': { name: 'ME & Africa' },
};

function getRegionIcon(regionId: RegionGroupId): React.ReactElement {
  switch (regionId) {
    case 'western': {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    }
    case 'eastern-europe': {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
          />
        </svg>
      );
    }
    case 'asian': {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    }
    case 'latin-america': {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    }
    case 'middle-east-africa': {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    }
  }
}

interface RegionChipsProps {
  selectedRegions: RegionGroupId[];
  onRegionsChange: (regions: RegionGroupId[]) => void;
  disabled?: boolean;
}

export const RegionChips: React.FC<RegionChipsProps> = ({
  selectedRegions,
  onRegionsChange,
  disabled = false,
}) => {
  const allRegions = Object.keys(REGION_INFO) as RegionGroupId[];

  const handleRegionToggle = (regionId: RegionGroupId) => {
    if (selectedRegions.includes(regionId)) {
      onRegionsChange(selectedRegions.filter(id => id !== regionId));
    } else {
      onRegionsChange([...selectedRegions, regionId]);
    }
  };

  const clearAllRegions = () => {
    onRegionsChange([]);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-300">
          Regions {selectedRegions.length > 0 && `(${selectedRegions.length})`}
        </label>
        {selectedRegions.length > 0 && (
          <button
            type="button"
            onClick={clearAllRegions}
            disabled={disabled}
            className="text-xs text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {allRegions.map(regionId => {
          const region = REGION_INFO[regionId];
          const isSelected = selectedRegions.includes(regionId);

          return (
            <button
              key={regionId}
              type="button"
              onClick={() => handleRegionToggle(regionId)}
              disabled={disabled}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
                isSelected
                  ? 'bg-linear-to-r from-amber-600 to-orange-600 text-white border-2 border-amber-400 shadow-md'
                  : 'bg-gray-800/60 backdrop-blur-sm text-gray-300 border-2 border-gray-600/50 hover:bg-gray-700/80 hover:border-gray-500'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {getRegionIcon(regionId)}
              <span>{region.name}</span>
              <svg
                className={`w-3 h-3 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
};
