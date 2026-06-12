import type { RegionGroupId } from '@findarr/shared/constants';
import { objectKeys } from '@findarr/shared/utils';

import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Icon, type IconName } from '../ui/Icon';

// Region metadata for UI display (TMDB mapping handled server-side)
const REGION_INFO: Record<RegionGroupId, string> = {
  western: 'Western',
  'eastern-europe': 'E. Europe',
  asian: 'Asian',
  'latin-america': 'Latin America',
  'middle-east-africa': 'ME & Africa',
};

const REGION_ICONS: Record<RegionGroupId, IconName> = {
  western: 'language',
  'eastern-europe': 'flag',
  asian: 'language',
  'latin-america': 'language',
  'middle-east-africa': 'language',
};

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
                  ? 'border-amber-400/45 bg-amber-400/12 text-amber-100 hover:border-amber-300/60 hover:bg-amber-400/16 hover:text-amber-50'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100'
              } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <Icon name={REGION_ICONS[regionId]} size="sm" />
              <span>{regionName}</span>
              {isSelected && <Icon name="check" size="xs" />}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
