import type { ReactNode } from 'react';

interface RangeSettingProps {
  id: string;
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  description: ReactNode;
  suffix?: ReactNode;
}

export function RangeSetting({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange,
  description,
  suffix,
}: RangeSettingProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-gray-200">
          {label}
        </label>
        <span className="text-sm font-semibold text-amber-500">
          {value}
          {suffix}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => {
          onChange(Number(event.target.value));
        }}
        className="range-input w-full"
      />
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
}
