import React from 'react';
import { type RegionGroupId } from '@findarr/shared';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6c757d' }}>
          Content Regions
        </label>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={handleShowAll}
            disabled={disabled || isShowingAll}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: disabled || isShowingAll ? 'not-allowed' : 'pointer',
              opacity: disabled || isShowingAll ? 0.6 : 1,
            }}
          >
            All
          </button>
          <button
            type="button"
            onClick={handleHideAll}
            disabled={disabled || isShowingNone}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: disabled || isShowingNone ? 'not-allowed' : 'pointer',
              opacity: disabled || isShowingNone ? 0.6 : 1,
            }}
          >
            None
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.5rem',
        }}
      >
        {allRegions.map(regionId => {
          const region = REGION_INFO[regionId];
          const isSelected = selectedRegions.includes(regionId);

          return (
            <button
              key={regionId}
              type="button"
              onClick={() => handleRegionToggle(regionId)}
              disabled={disabled}
              style={{
                padding: '0.75rem',
                border: `2px solid ${isSelected ? '#28a745' : '#ddd'}`,
                borderRadius: '8px',
                backgroundColor: isSelected ? '#d4edda' : 'white',
                cursor: disabled ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                opacity: disabled ? 0.6 : 1,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                if (!disabled && !isSelected) {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                  e.currentTarget.style.borderColor = '#aaa';
                }
              }}
              onMouseLeave={e => {
                if (!disabled && !isSelected) {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.borderColor = '#ddd';
                }
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.25rem',
                }}
              >
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: isSelected ? '#28a745' : '#ddd',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    color: isSelected ? '#155724' : '#333',
                  }}
                >
                  {region.name}
                </span>
              </div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: isSelected ? '#155724' : '#666',
                  lineHeight: '1.2',
                  marginLeft: '1.5rem',
                }}
              >
                {region.description}
              </div>
            </button>
          );
        })}
      </div>

      {selectedRegions.length > 0 && selectedRegions.length < allRegions.length && (
        <div
          style={{
            fontSize: '0.75rem',
            color: '#6c757d',
            textAlign: 'center',
            fontStyle: 'italic',
          }}
        >
          Showing {selectedRegions.length} of {allRegions.length} content regions
        </div>
      )}
    </div>
  );
};
