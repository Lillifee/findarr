import { useTranslation } from 'react-i18next';

import type { ActivityAudience, ActivityStatusGroup } from '../../utils/activityFilters';
import { Badge } from '../ui/Badge';
import { ClearAllButton } from '../ui/ClearAllButton';
import { Icon } from '../ui/Icon';
import { OptionButton } from '../ui/OptionButton';
import { PanelSection } from '../ui/PanelSection';

interface ActivityStatusFilterProps {
  audience: ActivityAudience;
  statusGroups: ActivityStatusGroup[];
  onAudienceChange: (audience: ActivityAudience) => void;
  onStatusGroupsChange: (statusGroups: ActivityStatusGroup[]) => void;
}

export function ActivityStatusFilter({
  audience,
  statusGroups,
  onAudienceChange,
  onStatusGroupsChange,
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

  const statusOptions = (
    ['voting', 'requested', 'available', 'downloading', 'warning'] as const
  ).map((value) => ({
    value,
    title: t(`activity.status.${value}`),
  }));

  const toggleStatusGroup = (value: ActivityStatusGroup) => {
    const nextStatusGroups = statusGroups.includes(value)
      ? statusGroups.filter((group) => group !== value)
      : [...statusGroups, value];

    onStatusGroupsChange(nextStatusGroups);
  };

  const clearAllStatusGroups = () => {
    onStatusGroupsChange([]);
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
            onClick={clearAllStatusGroups}
            disabled={statusGroups.length === 0}
            hidden={statusGroups.length === 0}
          >
            {t('catalog.clearAll')}
          </ClearAllButton>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {statusOptions.map((option) => (
            <Badge
              key={option.value}
              variant="secondary"
              selected={statusGroups.includes(option.value)}
              interactive
              onClick={() => {
                toggleStatusGroup(option.value);
              }}
              className="px-3 py-1.5 text-xs shadow-none backdrop-blur-none"
            >
              <span>{option.title}</span>
              <span className="flex h-3 w-3 items-center justify-center">
                <Icon
                  className={`transition-opacity ${statusGroups.includes(option.value) ? 'opacity-100' : 'opacity-0'}`}
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
