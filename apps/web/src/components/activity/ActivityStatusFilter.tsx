import { useTranslation } from 'react-i18next';

import type { ActivityAudience, ActivityStatusGroup } from '../../utils/activityFilters';
import { OptionButton } from '../ui/OptionButton';
import { PanelSection } from '../ui/PanelSection';

interface ActivityStatusFilterProps {
  audience: ActivityAudience;
  statusGroup: ActivityStatusGroup;
  onAudienceChange: (audience: ActivityAudience) => void;
  onStatusGroupChange: (statusGroup: ActivityStatusGroup) => void;
}

export function ActivityStatusFilter({
  audience,
  statusGroup,
  onAudienceChange,
  onStatusGroupChange,
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

  const statusOptions = [
    {
      value: 'all' as const,
      title: t('activity.status.all'),
      description: t('activity.status.allDesc'),
    },
    {
      value: 'voting' as const,
      title: t('activity.status.voting'),
      description: t('activity.status.votingDesc'),
    },
    {
      value: 'requested' as const,
      title: t('activity.status.requested'),
      description: t('activity.status.requestedDesc'),
    },
    {
      value: 'available' as const,
      title: t('activity.status.available'),
      description: t('activity.status.availableDesc'),
    },
    {
      value: 'attention' as const,
      title: t('activity.status.attention'),
      description: t('activity.status.attentionDesc'),
    },
  ];

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
        <div className="mb-2.5">
          <h4 className="text-sm font-semibold text-white">{t('activity.statusLabel')}</h4>
        </div>
        <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
          {statusOptions.map((option) => (
            <OptionButton
              key={option.value}
              selected={statusGroup === option.value}
              onClick={() => {
                onStatusGroupChange(option.value);
              }}
              title={option.title}
              description={option.description}
            />
          ))}
        </div>
      </PanelSection>
    </div>
  );
}
