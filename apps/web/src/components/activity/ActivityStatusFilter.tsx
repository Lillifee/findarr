import type { InteractionsQuery } from '@findarr/shared/interaction';
import { useTranslation } from 'react-i18next';

import { OptionButton } from '../ui/OptionButton';
import { PanelSection } from '../ui/PanelSection';

type ActionFilter = InteractionsQuery['action'];

interface ActivityStatusFilterProps {
  actionFilter: ActionFilter;
  onActionChange: (action: ActionFilter) => void;
}

export function ActivityStatusFilter({ actionFilter, onActionChange }: ActivityStatusFilterProps) {
  const { t } = useTranslation();

  const statusOptions = [
    {
      value: 'all' as ActionFilter,
      title: t('activity.filter.all'),
      description: t('activity.filter.allDesc'),
    },
    {
      value: 'liked' as ActionFilter,
      title: t('activity.filter.upvotes'),
      description: t('activity.filter.upvotesDesc'),
    },
    {
      value: 'disliked' as ActionFilter,
      title: t('activity.filter.downvotes'),
      description: t('activity.filter.downvotesDesc'),
    },
  ];

  return (
    <PanelSection>
      <div className="mb-2.5">
        <h4 className="text-sm font-semibold text-white">{t('common.votingStatus')}</h4>
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
