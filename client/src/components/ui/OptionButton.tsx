import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface OptionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
}

export function OptionButton({
  selected = false,
  title,
  description,
  icon,
  className = '',
  ...props
}: OptionButtonProps) {
  return (
    <button
      type="button"
      className={`rounded-lg border px-3.5 py-3 text-left transition-colors ${
        selected
          ? 'border-gray-400 bg-gray-300/90 text-gray-950 hover:border-gray-200 hover:bg-gray-200 hover:text-gray-950'
          : 'border-gray-600/70 bg-gray-800/80 text-gray-100 hover:border-gray-400 hover:bg-gray-700/80 hover:text-white'
      } ${className}`}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{title}</div>
          {description && (
            <div
              className={`mt-1.5 text-sm leading-5 ${selected ? 'text-gray-800' : 'text-gray-300'}`}
            >
              {description}
            </div>
          )}
        </div>
        {icon && <div className="shrink-0">{icon}</div>}
      </div>
    </button>
  );
}
