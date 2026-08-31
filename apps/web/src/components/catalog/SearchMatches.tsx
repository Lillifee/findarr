import type { Genre, Keyword, Person } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';
import { useTranslation } from 'react-i18next';

import { tmdbImage } from '../../utils/tmdb';
import { Icon } from '../ui/Icon';

interface SearchMatchesProps {
  genres: Genre[];
  keywords: Keyword[];
  people: Person[];
  onSelectGenre: (genre: Genre) => void;
  onSelectKeyword: (keyword: Keyword) => void;
  onSelectPerson: (person: Person) => void;
}

export function SearchMatches({
  genres,
  keywords,
  people,
  onSelectGenre,
  onSelectKeyword,
  onSelectPerson,
}: SearchMatchesProps) {
  const { t } = useTranslation();

  if (genres.length === 0 && keywords.length === 0 && people.length === 0) {
    return null;
  }

  return (
    <aside className="flex flex-col gap-6" aria-label={t('explore.searchResults')}>
      {genres.length > 0 && (
        <section aria-label={t('catalog.genreResults')}>
          <h2 className="mb-2 text-xs font-semibold tracking-wide text-zinc-400 uppercase">
            {t('catalog.genreResults')}
          </h2>
          <div className="relative overflow-hidden">
            <div
              className="scrollbar-hidden overflow-x-auto overflow-y-hidden"
              style={{
                WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 5rem), transparent)',
                maskImage: 'linear-gradient(to right, black calc(100% - 5rem), transparent)',
              }}
            >
              <div className="flex w-max gap-2 pr-16">
                {genres.map((genre) => (
                  <button
                    key={genre.id}
                    type="button"
                    onClick={() => {
                      onSelectGenre(genre);
                    }}
                    className="rounded-full border border-zinc-800/80 bg-zinc-950/72 px-2.5 py-1 text-xs text-zinc-200 transition-colors hover:border-amber-500/60 hover:text-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
                  >
                    {genre.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {keywords.length > 0 && (
        <section aria-label={t('catalog.keywordResults')}>
          <h2 className="mb-2 text-xs font-semibold tracking-wide text-zinc-400 uppercase">
            {t('catalog.keywordResults')}
          </h2>
          {/* Restricts height to exactly 2 rows + gap, hides overflow */}
          <div className="max-h-15 overflow-hidden">
            <div className="flex flex-row flex-wrap gap-2">
              {keywords.map((keyword) => (
                <button
                  key={keyword.id}
                  type="button"
                  onClick={() => {
                    onSelectKeyword(keyword);
                  }}
                  className="rounded-full border border-zinc-800/80 bg-zinc-950/72 px-2.5 py-1 text-xs whitespace-nowrap text-zinc-200 transition-colors hover:border-amber-500/60 hover:text-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
                >
                  {keyword.name}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {people.length > 0 && (
        <section aria-label={t('catalog.peopleResults')}>
          <h2 className="mb-3 text-xs font-semibold tracking-wide text-zinc-400 uppercase">
            {t('catalog.peopleResults')}
          </h2>
          <div className="relative overflow-hidden">
            <div
              className="scrollbar-hidden overflow-x-auto overflow-y-hidden"
              style={{
                WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 5rem), transparent)',
                maskImage: 'linear-gradient(to right, black calc(100% - 5rem), transparent)',
              }}
            >
              <div className="flex gap-7 px-1 pb-2">
                {people.map((person) => (
                  <button
                    key={person.tmdbId}
                    type="button"
                    onClick={() => {
                      onSelectPerson(person);
                    }}
                    className="flex w-20 shrink-0 flex-col items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  >
                    {isDefined(person.profilePath) ? (
                      <img
                        src={tmdbImage(person.profilePath, 'w185')}
                        alt={person.name}
                        className="mb-2 h-20 w-20 rounded-full border border-zinc-800/80 object-cover shadow-lg"
                      />
                    ) : (
                      <span className="mb-2 flex h-20 w-20 items-center justify-center rounded-full border border-zinc-800/80 bg-zinc-900/80 shadow-lg">
                        <Icon filled className="text-zinc-500" name="person" size="xl" />
                      </span>
                    )}
                    <span className="w-full truncate text-center text-xs font-medium text-white">
                      {person.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </aside>
  );
}
