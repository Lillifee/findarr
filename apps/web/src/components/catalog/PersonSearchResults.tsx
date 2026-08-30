import type { Person } from '@findarr/shared/media';
import { useTranslation } from 'react-i18next';

import { PeopleGrid } from '../media/PeopleGrid';

interface PersonSearchResultsProps {
  people: Person[];
}

export function PersonSearchResults({ people }: PersonSearchResultsProps) {
  const { t } = useTranslation();

  if (people.length === 0) {
    return null;
  }

  return (
    <section aria-label={t('catalog.peopleResults')}>
      <h2 className="mb-4 text-2xl font-semibold text-white drop-shadow-md">
        {t('catalog.peopleResults')}
      </h2>
      <PeopleGrid
        people={people.map((person) => ({
          id: person.tmdbId,
          name: person.name,
          profilePath: person.profilePath,
          subtitle: person.knownForDepartment,
        }))}
      />
    </section>
  );
}
