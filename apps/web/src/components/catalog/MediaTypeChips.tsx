import type { SearchType } from '@findarr/shared/media';
import { useTranslation } from 'react-i18next';

import { SegmentedControl, type SegmentedControlOption } from '../ui/SegmentedControl';

interface MediaTypeChipsProps {
  selectedType: SearchType;
  onChange: (type: SearchType) => void;
  disabled?: boolean;
}

const typeKeys: Record<SearchType, string> = {
  both: 'catalog.typeAll',
  movie: 'catalog.typeMovies',
  tv: 'catalog.typeShows',
};

const options: SegmentedControlOption<SearchType>[] = [
  { value: 'both', label: 'All', icon: 'apps' },
  { value: 'movie', label: 'Movies', icon: 'movie' },
  { value: 'tv', label: 'Shows', icon: 'tv' },
];

export function MediaTypeChips({ selectedType, onChange, disabled = false }: MediaTypeChipsProps) {
  const { t } = useTranslation();
  return (
    <SegmentedControl
      ariaLabel={t('catalog.type')}
      options={options}
      selectedValue={selectedType}
      onChange={onChange}
      disabled={disabled}
      renderLabel={(option) => t(typeKeys[option.value])}
    />
  );
}
