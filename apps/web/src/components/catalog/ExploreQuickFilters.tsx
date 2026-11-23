import type { DiscoveryFilter } from '@findarr/shared/catalog';
import type { Provider } from '@findarr/shared/media';
import { useTranslation } from 'react-i18next';

import { last3Months, next30Days } from '../../utils/discoveryDateRanges';
import { QuickActionBar, type QuickActionItem } from '../ui';

interface ExploreQuickFiltersProps {
  providers: Provider[];
  selectedFilters: DiscoveryFilter[];
  defaultUpcomingSelected: boolean;
  onSelectPreset: (...selected: DiscoveryFilter[]) => void;
}

const netflixId = 8;
const disneyPlusId = 337;

function matchesPreset(selected: DiscoveryFilter[], preset: DiscoveryFilter[]) {
  return (
    selected.length === preset.length &&
    preset.every((filter) =>
      selected.some(({ type, id }) => type === filter.type && id === filter.id),
    )
  );
}

export function ExploreQuickFilters({
  providers,
  selectedFilters,
  defaultUpcomingSelected,
  onSelectPreset,
}: ExploreQuickFiltersProps) {
  const { t } = useTranslation();
  const netflix = providers.find(({ id }) => id === netflixId);
  const disneyPlus = providers.find(({ id }) => id === disneyPlusId);

  const upcomingFilter: DiscoveryFilter = {
    type: 'date',
    id: next30Days.id,
    name: t(next30Days.label),
  };

  const recentFilter: DiscoveryFilter = {
    type: 'date',
    id: last3Months.id,
    name: t(last3Months.label),
  };

  const streamingFilter: DiscoveryFilter = {
    type: 'availability',
    id: 'flatrate',
    name: t('catalog.availabilityStream'),
  };

  const rentFilter: DiscoveryFilter = {
    type: 'availability',
    id: 'rent',
    name: t('catalog.availabilityRent'),
  };

  const recentOnProvider = (provider: Provider): DiscoveryFilter[] => [
    recentFilter,
    { type: 'provider', id: provider.id, name: provider.name },
  ];

  const quickActions: QuickActionItem[] = [
    {
      id: 'upcoming',
      label: t('catalog.upcoming'),
      icon: 'calendar_month',
      selected: defaultUpcomingSelected || matchesPreset(selectedFilters, [upcomingFilter]),
      onClick: () => {
        onSelectPreset(upcomingFilter);
      },
    },
    {
      id: 'recent-streaming',
      label: t('catalog.recentOnStreaming'),
      icon: 'play_arrow',
      selected: matchesPreset(selectedFilters, [recentFilter, streamingFilter]),
      onClick: () => {
        onSelectPreset(recentFilter, streamingFilter);
      },
    },
    {
      id: 'for-rent',
      label: t('catalog.forRent'),
      icon: 'sell',
      selected: matchesPreset(selectedFilters, [rentFilter]),
      onClick: () => {
        onSelectPreset(rentFilter);
      },
    },
    ...(netflix
      ? [
          {
            id: 'recent-netflix',
            label: t('catalog.recentOnProvider', { provider: netflix.name }),
            icon: 'play_arrow' as const,
            selected: matchesPreset(selectedFilters, recentOnProvider(netflix)),
            onClick: () => {
              onSelectPreset(...recentOnProvider(netflix));
            },
          },
        ]
      : []),
    ...(disneyPlus
      ? [
          {
            id: 'recent-disney-plus',
            label: t('catalog.recentOnProvider', { provider: disneyPlus.name }),
            icon: 'play_arrow' as const,
            selected: matchesPreset(selectedFilters, recentOnProvider(disneyPlus)),
            onClick: () => {
              onSelectPreset(...recentOnProvider(disneyPlus));
            },
          },
        ]
      : []),
  ];

  return <QuickActionBar items={quickActions} />;
}
