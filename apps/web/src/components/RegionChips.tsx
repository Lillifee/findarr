import type { RegionGroupId } from '@findarr/shared/constants';
import { objectKeys } from '@findarr/shared/utils';
import React from 'react';

import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

// Region metadata for UI display (TMDB mapping handled server-side)
const REGION_INFO: Record<RegionGroupId, string> = {
  western: 'Western',
  'eastern-europe': 'E. Europe',
  asian: 'Asian',
  'latin-america': 'Latin America',
  'middle-east-africa': 'ME & Africa',
};

function getRegionIcon(regionId: RegionGroupId): React.ReactElement {
  switch (regionId) {
    case 'western': {
      return (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    }
    default: {
      return <svg />;
    }
  }
}

interface RegionChipsProps {
  selectedRegions: RegionGroupId[];
  onRegionsChange: (regions: RegionGroupId[]) => void;
  disabled?: boolean;
}

export function RegionChips({
  selectedRegions,
  onRegionsChange,
  disabled = false,
}: RegionChipsProps) {
  const allRegions = objectKeys(REGION_INFO);

  const handleRegionToggle = (regionId: RegionGroupId) => {
    if (selectedRegions.includes(regionId)) {
      onRegionsChange(selectedRegions.filter((id) => id !== regionId));
    } else {
      onRegionsChange([...selectedRegions, regionId]);
    }
  };

  const clearAllRegions = () => {
    onRegionsChange([]);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-300">
          Regions {selectedRegions.length > 0 && `(${selectedRegions.length})`}
        </label>
        {selectedRegions.length > 0 && (
          <Button
            type="button"
            onClick={clearAllRegions}
            disabled={disabled}
            variant="ghost"
            size="sm"
            className="text-xs"
          >
            Clear all
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {allRegions.map((regionId) => {
          const regionName = REGION_INFO[regionId];
          const isSelected = selectedRegions.includes(regionId);

          return (
            <Badge
              key={regionId}
              variant="secondary"
              selected={isSelected}
              interactive
              onClick={() => {
                if (!disabled) {
                  handleRegionToggle(regionId);
                }
              }}
              className={`px-3 py-1.5 text-xs shadow-none backdrop-blur-none ${
                isSelected
                  ? 'border-gray-300 bg-gray-200 text-gray-950 hover:border-white hover:bg-gray-100 hover:text-gray-950'
                  : 'border-gray-700 bg-gray-800/70 text-gray-300 hover:border-gray-500 hover:bg-gray-700/80 hover:text-white'
              } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              {getRegionIcon(regionId)}
              <span>{regionName}</span>
              {isSelected && (
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
