import type { RegionGroupId } from '@findarr/shared/constants';
import { objectKeys } from '@findarr/shared/utils';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { OptionButton } from '../ui/OptionButton';

const REGION_KEYS: Record<RegionGroupId, { nameKey: string; descKey: string }> = {
  western: { nameKey: 'regions.western', descKey: 'regions.westernDesc' },
  'eastern-europe': { nameKey: 'regions.easternEurope', descKey: 'regions.easternEuropeDesc' },
  asian: { nameKey: 'regions.asian', descKey: 'regions.asianDesc' },
  'latin-america': { nameKey: 'regions.latinAmerica', descKey: 'regions.latinAmericaDesc' },
  'middle-east-africa': {
    nameKey: 'regions.middleEastAfrica',
    descKey: 'regions.middleEastAfricaDesc',
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
  const { t } = useTranslation();
  const allRegions = objectKeys(REGION_KEYS);

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
        <label className="text-sm font-medium text-zinc-400">{t('regions.label')}</label>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2">
        {allRegions.map((regionId) => {
          const isSelected = selectedRegions.includes(regionId);

          return (
            <OptionButton
              key={regionId}
              onClick={() => {
                handleRegionToggle(regionId);
              }}
              disabled={disabled}
              selected={isSelected}
              title={t(REGION_KEYS[regionId].nameKey)}
              description={t(REGION_KEYS[regionId].descKey)}
              className={disabled ? 'cursor-not-allowed opacity-60' : ''}
            />
          );
        })}
      </div>

      {selectedRegions.length > 0 && selectedRegions.length < allRegions.length && (
        <div className="text-center text-xs text-zinc-400 italic">
          {t('regions.showing', { count: selectedRegions.length, total: allRegions.length })}
        </div>
      )}
    </div>
  );
};
