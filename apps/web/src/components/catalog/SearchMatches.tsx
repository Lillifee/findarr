import type { Genre, Keyword, Media, Person } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { tmdbImage } from '../../utils/tmdb';
import { Icon } from '../ui/Icon';
import { DiscoveryTag } from './DiscoveryTag';

const emptyResults: Media[] = [];

interface ExpandableSectionProps {
  children: ReactNode;
  collapsedClassName: string;
  heading: string;
  headingClassName?: string;
}

function ExpandableSection({
  children,
  collapsedClassName,
  heading,
  headingClassName = 'mb-2',
}: ExpandableSectionProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) {
      return () => {};
    }

    const updateOverflow = () => {
      if (!expanded) {
        setHasMore(content.scrollHeight > content.clientHeight + 1);
      }
    };

    updateOverflow();
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(content);
    return () => {
      observer.disconnect();
    };
  }, [children, expanded]);

  return (
    <>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2
          className={`${headingClassName} text-xs font-semibold tracking-wide text-zinc-400 uppercase`}
        >
          {heading}
        </h2>
        {hasMore && (
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-800 hover:text-amber-300"
            aria-expanded={expanded}
            aria-label={heading}
            title={heading}
            onClick={() => {
              setExpanded((current) => !current);
            }}
          >
            <Icon name={expanded ? 'expand_less' : 'expand_more'} size="sm" />
          </button>
        )}
      </div>
      <div
        ref={contentRef}
        className={expanded ? undefined : `${collapsedClassName} overflow-hidden`}
      >
        {children}
      </div>
    </>
  );
}

interface SearchMatchesProps {
  genres: Genre[];
  keywords: Keyword[];
  people: Person[];
  results?: Media[];
  onSelectMedia?: (media: Media) => void;
  onSelectGenre: (genre: Genre) => void;
  onSelectKeyword: (keyword: Keyword) => void;
  onSelectPerson: (person: Person) => void;
  showPeople?: boolean;
  compact?: boolean;
  className?: string;
}

export function SearchMatches({
  genres,
  keywords,
  people,
  results = emptyResults,
  onSelectMedia,
  onSelectGenre,
  onSelectKeyword,
  onSelectPerson,
  showPeople = true,
  compact = false,
  className,
}: SearchMatchesProps) {
  const visiblePeople = showPeople ? people : [];
  const { t } = useTranslation();

  if (
    results.length === 0 &&
    genres.length === 0 &&
    keywords.length === 0 &&
    visiblePeople.length === 0
  ) {
    return null;
  }
  return (
    <aside
      className={`flex flex-col [&>section+section]:mt-5 [&>section+section]:border-t [&>section+section]:border-zinc-800/80 [&>section+section]:pt-5 ${className ?? ''}`}
      aria-label={t('explore.searchResults')}
    >
      {genres.length > 0 && (
        <section aria-label={t('catalog.genreResults')}>
          <ExpandableSection collapsedClassName="max-h-17" heading={t('catalog.genreResults')}>
            <div className="flex flex-row flex-wrap gap-2">
              {genres.map((genre) => (
                <DiscoveryTag
                  key={genre.id}
                  type="genre"
                  name={genre.name}
                  onClick={() => {
                    onSelectGenre(genre);
                  }}
                />
              ))}
            </div>
          </ExpandableSection>
        </section>
      )}

      {keywords.length > 0 && (
        <section aria-label={t('catalog.keywordResults')}>
          <ExpandableSection collapsedClassName="max-h-17" heading={t('catalog.keywordResults')}>
            <div className="flex flex-row flex-wrap gap-2">
              {keywords.map((keyword) => (
                <DiscoveryTag
                  key={keyword.id}
                  type="keyword"
                  name={keyword.name}
                  onClick={() => {
                    onSelectKeyword(keyword);
                  }}
                />
              ))}
            </div>
          </ExpandableSection>
        </section>
      )}

      {visiblePeople.length > 0 && (
        <section aria-label={t('catalog.peopleResults')}>
          <ExpandableSection
            collapsedClassName={compact ? 'max-h-24' : 'max-h-28'}
            heading={t('catalog.peopleResults')}
          >
            <div className={`flex flex-wrap px-1 ${compact ? 'gap-4' : 'gap-7'}`}>
              {visiblePeople.map((person) => (
                <button
                  key={person.tmdbId}
                  type="button"
                  onClick={() => {
                    onSelectPerson(person);
                  }}
                  className={`flex shrink-0 flex-col items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${compact ? 'w-16' : 'w-20'}`}
                >
                  {isDefined(person.profilePath) ? (
                    <img
                      src={tmdbImage(person.profilePath, 'w185')}
                      alt={person.name}
                      className={`${compact ? 'h-16 w-16' : 'h-20 w-20'} mb-2 rounded-full border border-zinc-800/80 object-cover shadow-lg`}
                    />
                  ) : (
                    <span
                      className={`${compact ? 'h-16 w-16' : 'h-20 w-20'} mb-2 flex items-center justify-center rounded-full border border-zinc-800/80 bg-zinc-900/80 shadow-lg`}
                    >
                      <Icon filled className="text-zinc-500" name="person" size="xl" />
                    </span>
                  )}
                  <span className="w-full truncate text-center text-xs font-medium text-white">
                    {person.name}
                  </span>
                </button>
              ))}
            </div>
          </ExpandableSection>
        </section>
      )}
      {results.length > 0 && (
        <section aria-label={t('catalog.mediaResults')}>
          <ExpandableSection collapsedClassName="max-h-60" heading={t('catalog.mediaResults')}>
            <div className="flex flex-wrap gap-3">
              {results.slice(0, 14).map((media) => (
                <button
                  key={`${media.type}-${media.tmdbId}`}
                  type="button"
                  className="flex w-32 shrink-0 flex-col text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  onClick={() => {
                    onSelectMedia?.(media);
                  }}
                >
                  {isDefined(media.posterPath) ? (
                    <img
                      src={tmdbImage(media.posterPath, 'w185')}
                      alt=""
                      className="mb-2 aspect-2/3 w-full rounded-md object-cover"
                    />
                  ) : (
                    <span className="mb-2 flex aspect-2/3 w-full items-center justify-center rounded-md bg-zinc-900 text-zinc-500">
                      <Icon name={media.type === 'movie' ? 'movie' : 'tv'} size="lg" />
                    </span>
                  )}
                  <span className="line-clamp-2 text-xs font-medium text-white">{media.name}</span>
                </button>
              ))}
            </div>
          </ExpandableSection>
        </section>
      )}
    </aside>
  );
}
