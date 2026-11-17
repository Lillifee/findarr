import type { ReactNode } from 'react';

import { Icon, type IconName } from './Icon';

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
  icon: IconName;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  selectedValue: T;
  disabled?: boolean;
  size?: 'sm' | 'md';
  onChange: (value: T) => void;
  renderLabel?: (option: SegmentedControlOption<T>) => ReactNode;
  showLabelsOnMobile?: boolean;
}

function defaultRenderLabel<T extends string>(option: SegmentedControlOption<T>) {
  return option.label;
}

export function SegmentedControl<T extends string>({
  options,
  selectedValue,
  disabled = false,
  size = 'md',
  onChange,
  renderLabel = defaultRenderLabel,
  showLabelsOnMobile = false,
}: SegmentedControlProps<T>) {
  return (
    <div
      className="inline-flex shrink-0 overflow-hidden rounded-lg bg-zinc-900 text-zinc-200 ring-1 ring-zinc-800 ring-inset"
      role="group"
    >
      {options.map((option, index) => {
        const selected = selectedValue === option.value;
        const edgeClass = `${index === 0 ? 'rounded-l-lg' : ''} ${index === options.length - 1 ? 'rounded-r-lg' : ''}`;
        const stateClass = selected
          ? 'bg-amber-400/12 text-amber-100 ring-1 ring-amber-400/45 ring-inset hover:bg-amber-400/16 hover:text-amber-50'
          : 'bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100';

        return (
          <button
            key={option.value}
            type="button"
            aria-label={option.label}
            aria-pressed={selected}
            disabled={disabled}
            title={option.label}
            onClick={() => {
              onChange(option.value);
            }}
            className={`box-border inline-flex items-center gap-1.5 font-medium transition-colors ${
              size === 'sm' ? 'h-7 px-2 py-1 text-xs' : 'h-10 px-2.5 py-1.5 text-sm sm:px-3'
            } ${edgeClass} ${stateClass} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            <Icon name={option.icon} size="sm" />
            <span className={showLabelsOnMobile ? undefined : 'max-[600px]:hidden'}>
              {renderLabel(option)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
