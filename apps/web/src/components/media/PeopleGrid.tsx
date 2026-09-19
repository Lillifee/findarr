import { isDefined } from '@findarr/shared/utils';
import { useTranslation } from 'react-i18next';

import { tmdbImage } from '../../utils/tmdb';
import { HorizontalRail } from '../ui/HorizontalRail';
import { Icon } from '../ui/Icon';

export interface PersonGridItem {
  id: number;
  name: string;
  profilePath: string | undefined;
  subtitle: string | undefined;
}

interface PeopleGridProps<T extends PersonGridItem> {
  people: T[];
  onSelect?: (person: T) => void;
  ariaLabel?: string;
}

export function PeopleGrid<T extends PersonGridItem>({
  people,
  onSelect,
  ariaLabel,
}: PeopleGridProps<T>) {
  const { t } = useTranslation();

  return (
    <HorizontalRail
      ariaLabel={ariaLabel ?? t('catalog.peopleResults')}
      contentClassName="flex gap-4"
      nextLabel={t('common.next')}
      previousLabel={t('common.previous')}
    >
      {people.map((person) => (
        <button
          key={person.id}
          type="button"
          onClick={() => onSelect?.(person)}
          disabled={!onSelect}
          className={`flex w-28 shrink-0 flex-col items-center md:w-32 ${
            onSelect
              ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500'
              : ''
          }`}
        >
          {isDefined(person.profilePath) ? (
            <img
              src={tmdbImage(person.profilePath, 'w185')}
              alt={person.name}
              className="mb-2 h-20 w-20 rounded-full border border-zinc-800/80 object-cover shadow-lg"
            />
          ) : (
            <div className="mb-2 flex h-20 w-20 items-center justify-center rounded-full border border-zinc-800/80 bg-zinc-900/80 shadow-lg">
              <Icon filled className="text-zinc-500" name="person" size="xl" />
            </div>
          )}
          <div className="w-full text-center">
            <p className="truncate text-xs font-medium text-white">{person.name}</p>
            {isDefined(person.subtitle) && (
              <p className="text-2xs truncate text-gray-400">{person.subtitle}</p>
            )}
          </div>
        </button>
      ))}
    </HorizontalRail>
  );
}
