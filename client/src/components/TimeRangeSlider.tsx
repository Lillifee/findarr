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
    const index = Number.parseInt(event.target.value);
    const period = TIME_PERIODS[index];
    if (period) {
      onChange(period.days);
    }
  };

  return (
    <div className="p-3 md:p-4 bg-gray-700/30 border border-gray-600 rounded-lg">
      <div className="flex justify-between items-center mb-3 md:mb-4">
        <label className="font-semibold text-white text-sm md:text-base flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span>Time Range</span>
        </label>
        <span className="bg-linear-to-r from-amber-600 to-orange-600 text-white px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium shadow-md">
          {currentPeriod.label}
        </span>
      </div>

      <div className="relative">
        <input
          type="range"
          min="0"
          max={TIME_PERIODS.length - 1}
          value={currentIndex}
          onChange={handleSliderChange}
          className="w-full h-2 rounded bg-gray-600 outline-none cursor-pointer accent-amber-500"
        />

        <div className="flex justify-between mt-2 text-xs text-gray-400">
          {TIME_PERIODS.map((period, index) => (
            <span
              key={period.days}
              className={`text-center ${index === currentIndex ? 'font-semibold text-amber-400' : 'font-normal'}`}
            >
              <span className="hidden sm:inline">{period.label.split(' ')[1] || period.label}</span>
              <span className="sm:hidden">{period.label.split(' ')[1]?.charAt(0) || 'M'}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="mt-2 md:mt-3 text-xs md:text-sm text-gray-400 text-center">
        <span className="hidden sm:inline">
          Discover movies and TV shows from {currentPeriod.label.toLowerCase()} to next week
        </span>
        <span className="sm:hidden">{currentPeriod.label}</span>
      </div>
    </div>
  );
}
