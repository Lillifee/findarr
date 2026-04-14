import type { SearchType } from '@findarr/shared';
import { Badge } from './ui/Badge';

interface MediaTypeChipsProps {
  selectedType: SearchType;
  onChange: (type: SearchType) => void;
  disabled?: boolean;
}

const types: { value: SearchType; label: string }[] = [
  { value: 'both', label: 'All' },
  { value: 'movie', label: 'Movies' },
  { value: 'tv', label: 'TV Shows' },
];

function getIcon(type: SearchType) {
  if (type === 'both') {
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
        />
      </svg>
    );
  }
  if (type === 'movie') {
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
        />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

export function MediaTypeChips({ selectedType, onChange, disabled = false }: MediaTypeChipsProps) {
  return (
    <div className="inline-flex border border-gray-700/50 rounded-lg overflow-hidden shadow-md bg-gray-800/60 backdrop-blur-sm">
      {types.map((type, index) => (
        <Badge
          key={type.value}
          variant="secondary"
          selected={selectedType === type.value}
          interactive={!disabled}
          onClick={() => !disabled && onChange(type.value)}
          className={`rounded-none ${index > 0 ? 'border-l border-gray-700/50' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {getIcon(type.value)}
          <span>{type.label}</span>
        </Badge>
      ))}
    </div>
  );
}
