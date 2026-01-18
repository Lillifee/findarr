import React from 'react';
import { RECENT_PERIOD_VALUES, type RecentPeriod } from '@findarr/shared';

interface TimeRangeSliderProps {
  value: RecentPeriod;
  onChange: (period: RecentPeriod) => void;
}

// Create display labels for each period value
const PERIOD_LABELS: Record<RecentPeriod, string> = {
  last_week: 'Last Week',
  last_month: 'Last Month',
  last_3_months: 'Last 3 Months',
  last_6_months: 'Last 6 Months',
  last_year: 'Last Year',
  last_2_years: 'Last 2 Years',
};

const TIME_PERIODS = RECENT_PERIOD_VALUES.map(value => ({
  value,
  label: PERIOD_LABELS[value],
}));

export function TimeRangeSlider({ value, onChange }: TimeRangeSliderProps) {
  const currentIndex = TIME_PERIODS.findIndex(period => period.value === value);
  const selectedIndex = currentIndex >= 0 ? currentIndex : 1; // default to 'last_month'

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(event.target.value);
    onChange(TIME_PERIODS[index].value);
  };

  return (
    <div
      style={{
        padding: '1rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        marginBottom: '2rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <label
          style={{
            fontWeight: '600',
            color: '#333',
            fontSize: '1rem',
          }}
        >
          Recent Content Filter
        </label>
        <span
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            padding: '0.25rem 0.75rem',
            borderRadius: '16px',
            fontSize: '0.875rem',
            fontWeight: '500',
          }}
        >
          {TIME_PERIODS[selectedIndex].label}
        </span>
      </div>

      <div style={{ position: 'relative' }}>
        <input
          type="range"
          min="0"
          max={TIME_PERIODS.length - 1}
          value={selectedIndex}
          onChange={handleSliderChange}
          style={{
            width: '100%',
            height: '8px',
            borderRadius: '4px',
            backgroundColor: '#ddd',
            outline: 'none',
            cursor: 'pointer',
          }}
        />

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '0.5rem',
            fontSize: '0.75rem',
            color: '#666',
          }}
        >
          {TIME_PERIODS.map((period, index) => (
            <span
              key={period.value}
              style={{
                textAlign: 'center',
                fontWeight: index === selectedIndex ? '600' : '400',
                color: index === selectedIndex ? '#007bff' : '#666',
              }}
            >
              {period.label.split(' ')[1] || period.label} {/* Show only "Week", "Month", etc. */}
            </span>
          ))}
        </div>
      </div>

      <div
        style={{
          marginTop: '0.75rem',
          fontSize: '0.875rem',
          color: '#666',
          textAlign: 'center',
        }}
      >
        Discover movies and TV shows from {TIME_PERIODS[selectedIndex].label.toLowerCase()} to next
        week
      </div>
    </div>
  );
}
