import { useTranslation } from 'react-i18next';

import {
  ALL_ACTIVITY_STATUSES,
  type ActivityAudience,
  type ActivityStatus,
} from '../../utils/activityFilters';
import { Badge } from '../ui/Badge';
import { ClearAllButton } from '../ui/ClearAllButton';
import { Icon } from '../ui/Icon';
import { OptionButton } from '../ui/OptionButton';
import { PanelSection } from '../ui/PanelSection';

interface ActivityStatusFilterProps {
  audience: ActivityAudience;
  statuses: ActivityStatus[];
  onAudienceChange: (audience: ActivityAudience) => void;
  onStatusChange: (statuses: ActivityStatus[]) => void;
}

export function ActivityStatusFilter({
  audience,
  statuses,
  onAudienceChange,
  onStatusChange,
}: ActivityStatusFilterProps) {
  const { t } = useTranslation();

  const audienceOptions = [
    {
      value: 'mine' as const,
      title: t('activity.audience.mine'),
      description: t('activity.audience.mineDesc'),
    },
    {
      value: 'everyone' as const,
      title: t('activity.audience.everyone'),
      description: t('activity.audience.everyoneDesc'),
    },
  ];

  const statusOptions = ALL_ACTIVITY_STATUSES.map((value) => ({
    value,
    title: t(`activity.status.${value}`),
  }));

  const toggleStatusGroup = (value: ActivityStatus) => {
    const nextStatus = statuses.includes(value)
      ? statuses.filter((group) => group !== value)
      : [...statuses, value];

    onStatusChange(nextStatus);
  };

  const clearStatus = () => {
    onStatusChange([]);
  };

  return (
    <div className="space-y-4">
      <PanelSection>
        <div className="mb-2.5">
          <h4 className="text-sm font-semibold text-white">{t('activity.audienceLabel')}</h4>
        </div>
        <div className="grid gap-2.5 md:grid-cols-2">
          {audienceOptions.map((option) => (
            <OptionButton
              key={option.value}
              selected={audience === option.value}
              onClick={() => {
                onAudienceChange(option.value);
              }}
              title={option.title}
              description={option.description}
            />
          ))}
        </div>
      </PanelSection>

      <PanelSection>
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-medium text-gray-300">{t('activity.statusLabel')}</label>
          <ClearAllButton
            onClick={clearStatus}
            disabled={statuses.length === 0}
            hidden={statuses.length === 0}
          >
            {t('catalog.clearAll')}
          </ClearAllButton>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {statusOptions.map((option) => (
            <Badge
              key={option.value}
              variant="secondary"
              selected={statuses.includes(option.value)}
              interactive
              onClick={() => {
                toggleStatusGroup(option.value);
              }}
              className="px-3 py-1.5 text-xs shadow-none backdrop-blur-none"
            >
              <span>{option.title}</span>
              <span className="flex h-3 w-3 items-center justify-center">
                <Icon
                  className={`transition-opacity ${statuses.includes(option.value) ? 'opacity-100' : 'opacity-0'}`}
                  name="check"
                  size="xs"
                />
              </span>
            </Badge>
          ))}
        </div>
      </PanelSection>
    </div>
  );
}
