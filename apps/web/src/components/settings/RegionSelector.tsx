import type { RegionGroupId } from '@findarr/shared/constants';
import { objectKeys } from '@findarr/shared/utils';
import React from 'react';

import { OptionButton } from '../ui/OptionButton';

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
  const allRegions = objectKeys(REGION_INFO);

  const handleRegionToggle = (regionId: RegionGroupId) => {
    if (selectedRegions.includes(regionId)) {
      // Remove it
      onRegionsChange(selectedRegions.filter((id) => id !== regionId));
    } else {
      // Add it
      onRegionsChange([...selectedRegions, regionId]);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-400">Content Regions</label>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2">
        {allRegions.map((regionId) => {
          const region = REGION_INFO[regionId];
          const isSelected = selectedRegions.includes(regionId);

          return (
            <OptionButton
              key={regionId}
              onClick={() => {
                handleRegionToggle(regionId);
              }}
              disabled={disabled}
              selected={isSelected}
              title={region.name}
              description={region.description}
              className={disabled ? 'cursor-not-allowed opacity-60' : ''}
            />
          );
        })}
      </div>

      {selectedRegions.length > 0 && selectedRegions.length < allRegions.length && (
        <div className="text-center text-xs text-zinc-400 italic">
          Showing {selectedRegions.length} of {allRegions.length} content regions
        </div>
      )}
    </div>
  );
};
