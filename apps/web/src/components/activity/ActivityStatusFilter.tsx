import type { InteractionsQuery } from '@findarr/shared/interaction';

import { OptionButton } from '../ui/OptionButton';

type ActionFilter = InteractionsQuery['action'];

interface StatusOption {
  value: ActionFilter;
  title: string;
  description: string;
}

const statusOptions: StatusOption[] = [
  { value: 'all', title: 'All activity', description: 'Show everything you have voted on.' },
  { value: 'liked', title: 'Upvotes', description: 'Focus on titles you liked.' },
  { value: 'disliked', title: 'Downvotes', description: 'Focus on titles you disliked.' },
];

function CheckIcon({ selected }: { selected: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
        selected
          ? 'border-gray-500 bg-gray-200/90 text-gray-900'
          : 'border-gray-600/70 bg-transparent text-transparent'
      }`}
    >
      ✓
    </span>
  );
}

interface ActivityStatusFilterProps {
  actionFilter: ActionFilter;
  onActionChange: (action: ActionFilter) => void;
}

export function ActivityStatusFilter({ actionFilter, onActionChange }: ActivityStatusFilterProps) {
  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-800/70 p-4">
      <div className="mb-2.5">
        <h4 className="text-sm font-semibold text-white">Voting status</h4>
      </div>
      <div className="grid gap-2.5 md:grid-cols-3">
        {statusOptions.map((option) => (
          <OptionButton
            key={option.value}
            selected={actionFilter === option.value}
            onClick={() => {
              onActionChange(option.value);
            }}
            title={option.title}
            description={option.description}
            icon={<CheckIcon selected={actionFilter === option.value} />}
          />
        ))}
      </div>
    </div>
  );
}
