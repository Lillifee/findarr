import type { ReactNode } from 'react';

import { Badge } from './Badge';
import { Icon, type IconName } from './Icon';

export interface QuickActionItem {
  id: string;
  label: string;
  icon: IconName;
  selected?: boolean;
  onClick: () => void;
}

interface QuickActionBarProps {
  title?: string;
  items: QuickActionItem[];
  children?: ReactNode;
}

export function QuickActionBar({ title, items, children }: QuickActionBarProps) {
  const hasTitle = title !== undefined && title !== '';

  return (
    <div className="space-y-2">
      {hasTitle ? (
        <div className="flex items-center justify-between gap-3 px-1">
          <h3 className="text-xs font-semibold tracking-[0.14em] text-zinc-500 uppercase">
            {title}
          </h3>
          {children}
        </div>
      ) : (
        children
      )}

      <div className="flex flex-wrap gap-1.5">
        {items.map((item) =>
          (() => {
            const isSelected = item.selected === true;

            return (
              <Badge
                key={item.id}
                variant="secondary"
                interactive
                selected={isSelected}
                onClick={item.onClick}
                className={`px-2.5 py-1.25 text-xs shadow-none backdrop-blur-none ${
                  isSelected
                    ? 'border-amber-400/45 bg-amber-400/12 text-amber-100 hover:border-amber-300/60 hover:bg-amber-400/16 hover:text-amber-50'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100'
                }`}
              >
                <Icon
                  className={isSelected ? 'text-amber-200' : 'text-zinc-400'}
                  name={item.icon}
                  size="xs"
                  filled={isSelected}
                  weight={600}
                />
                <span>{item.label}</span>
              </Badge>
            );
          })(),
        )}
      </div>
    </div>
  );
}
