import type { InteractionsQuery } from '@findarr/shared/interaction';

import { OptionButton } from '../ui/OptionButton';
import { PanelSection } from '../ui/PanelSection';

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

interface ActivityStatusFilterProps {
  actionFilter: ActionFilter;
  onActionChange: (action: ActionFilter) => void;
}

export function ActivityStatusFilter({ actionFilter, onActionChange }: ActivityStatusFilterProps) {
  return (
    <PanelSection>
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
          />
        ))}
      </div>
    </PanelSection>
  );
}
