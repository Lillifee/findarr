import React from 'react';

interface TimeRangeSliderProps {
  value: number;
  onChange: (days: number) => void;
}

// Define time period options with labels and days
const TIME_PERIODS = [
  { days: 30, label: 'Last Month' },
  { days: 180, label: 'Last 6 Months' },
  { days: 365, label: 'Last Year' },
  { days: 730, label: 'Last 2 Years' },
];

export function TimeRangeSlider({ value, onChange }: TimeRangeSliderProps) {
  const currentIndex = TIME_PERIODS.findIndex(period => period.days === value);
  const currentPeriod = TIME_PERIODS[currentIndex];

  // Fallback if period not found
  if (!currentPeriod) {
    return null;
  }

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(event.target.value);
    const period = TIME_PERIODS[index];
    if (period) {
      onChange(period.days);
    }
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
          {currentPeriod.label}
        </span>
      </div>

      <div style={{ position: 'relative' }}>
        <input
          type="range"
          min="0"
          max={TIME_PERIODS.length - 1}
          value={currentIndex}
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
              key={period.days}
              style={{
                textAlign: 'center',
                fontWeight: index === currentIndex ? '600' : '400',
                color: index === currentIndex ? '#007bff' : '#666',
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
        Discover movies and TV shows from {currentPeriod.label.toLowerCase()} to next week
      </div>
    </div>
  );
}
