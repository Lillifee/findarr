import { isDefined } from '@findarr/shared/utils';

import { tmdbImage } from '../../utils/tmdb';
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
}

export function PeopleGrid<T extends PersonGridItem>({ people, onSelect }: PeopleGridProps<T>) {
  return (
    <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {people.map((person) => (
        <button
          key={person.id}
          type="button"
          onClick={() => onSelect?.(person)}
          disabled={!onSelect}
          className={`flex flex-col items-center ${
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
    </div>
  );
}
