import type { DiscoveryType } from '../../utils/catalogSearchParams';
import type { IconName } from '../ui/Icon';

export const discoveryIcons: Record<DiscoveryType, IconName> = {
  date: 'schedule',
  genre: 'theater_comedy',
  keyword: 'sell',
  person: 'person',
  provider: 'play_arrow',
};
