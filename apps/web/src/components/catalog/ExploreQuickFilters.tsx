import type { DiscoveryFilter } from '@findarr/shared/catalog';
import type { Provider } from '@findarr/shared/media';
import { useTranslation } from 'react-i18next';

import { last3Months, next30Days } from '../../utils/discoveryDateRanges';
import { PanelSection } from '../ui/PanelSection';
import { DiscoveryTag } from './DiscoveryTag';

interface ExploreQuickFiltersProps {
  providers: Provider[];
  onSelectFilters: (...selected: DiscoveryFilter[]) => void;
}

const netflixId = 8;
const disneyPlusId = 337;

export function ExploreQuickFilters({ providers, onSelectFilters }: ExploreQuickFiltersProps) {
  const { t } = useTranslation();
  const netflix = providers.find(({ id }) => id === netflixId);
  const disneyPlus = providers.find(({ id }) => id === disneyPlusId);

  function selectRecentOn(provider: Provider) {
    onSelectFilters(
      { type: 'date', id: last3Months.id, name: t(last3Months.label) },
      { type: 'provider', id: provider.id, name: provider.name },
    );
  }

  return (
    <PanelSection heading={t('catalog.quickFilters')}>
      <div className="flex flex-wrap gap-2">
        <DiscoveryTag
          type="date"
          name={t('catalog.upcoming')}
          onClick={() => {
            onSelectFilters({ type: 'date', id: next30Days.id, name: t(next30Days.label) });
          }}
        />
        {netflix && (
          <DiscoveryTag
            type="provider"
            name={t('catalog.recentOnProvider', { provider: netflix.name })}
            onClick={() => {
              selectRecentOn(netflix);
            }}
          />
        )}
        {disneyPlus && (
          <DiscoveryTag
            type="provider"
            name={t('catalog.recentOnProvider', { provider: disneyPlus.name })}
            onClick={() => {
              selectRecentOn(disneyPlus);
            }}
          />
        )}
      </div>
    </PanelSection>
  );
}
