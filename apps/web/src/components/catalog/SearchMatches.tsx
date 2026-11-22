import type { WatchMonetizationType } from '@findarr/shared/catalog';
import type { Genre, Keyword, Media, Person, Provider } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { discoveryDateRanges } from '../../utils/discoveryDateRanges';
import { tmdbImage } from '../../utils/tmdb';
import { HorizontalRail } from '../ui/HorizontalRail';
import { Icon } from '../ui/Icon';
import { PanelSection } from '../ui/PanelSection';
import { DiscoveryTag } from './DiscoveryTag';
import { SuggestionTile } from './SuggestionTile';

const emptyProviders: Provider[] = [];
const emptyResults: Media[] = [];

const availabilityOptions: { id: WatchMonetizationType; label: string }[] = [
  { id: 'flatrate', label: 'catalog.availabilityStream' },
  { id: 'free', label: 'catalog.availabilityFree' },
  { id: 'ads', label: 'catalog.availabilityAds' },
  { id: 'rent', label: 'catalog.availabilityRent' },
  { id: 'buy', label: 'catalog.availabilityBuy' },
];

function TagGroup({
  items,
  type,
  onSelect,
}: {
  items: { id: number; name: string }[];
  type: 'date' | 'genre' | 'keyword';
  onSelect: (item: { id: number; name: string }) => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || expanded) {
      return () => {};
    }
    const buttons = list.querySelectorAll('button');
    const updateOverflow = () => {
      const height = list.clientHeight;
      setHasMore(list.scrollHeight > height + 1);
      for (const button of buttons) {
        button.inert = button.offsetTop + button.offsetHeight > height + 1;
      }
    };
    updateOverflow();
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(list);
    if (list.firstElementChild) {
      observer.observe(list.firstElementChild);
    }
    return () => {
      observer.disconnect();
      for (const button of buttons) {
        button.inert = false;
      }
    };
  }, [items, expanded]);

  return (
    <>
      <div
        ref={listRef}
        className={
          expanded ? undefined : 'relative max-h-17 overflow-clip [overflow-clip-margin:4px]'
        }
      >
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <DiscoveryTag
              key={item.id}
              type={type}
              name={item.name}
              onClick={() => {
                onSelect(item);
              }}
            />
          ))}
        </div>
      </div>
      {!expanded && hasMore && (
        <button
          type="button"
          aria-expanded={false}
          onClick={() => {
            setExpanded(true);
          }}
          className="mt-2 ml-auto block text-xs font-semibold text-amber-300 hover:text-amber-200 focus-visible:outline-amber-500"
        >
          {t('common.showMore')}
        </button>
      )}
    </>
  );
}

function MatchRail({
  heading,
  compact,
  children,
}: {
  heading: string;
  compact: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <PanelSection heading={heading} plain={compact}>
      <HorizontalRail
        ariaLabel={heading}
        contentClassName="flex gap-4 p-1"
        nextLabel={t('common.next')}
        previousLabel={t('common.previous')}
      >
        {children}
      </HorizontalRail>
    </PanelSection>
  );
}

interface SearchMatchesProps {
  genres: Genre[];
  keywords: Keyword[];
  people: Person[];
  providers?: Provider[];
  results?: Media[];
  onSelectMedia?: (media: Media) => void;
  onSelectGenre: (genre: Genre) => void;
  onSelectKeyword: (keyword: Keyword) => void;
  onSelectPerson: (person: Person) => void;
  onSelectDateRange?: (id: number, name: string) => void;
  onSelectProvider?: (provider: Provider) => void;
  onSelectAvailability?: (availability: WatchMonetizationType, name: string) => void;
  showPeople?: boolean;
  compact?: boolean;
}

export function SearchMatches({
  genres,
  keywords,
  people,
  providers = emptyProviders,
  results = emptyResults,
  onSelectMedia,
  onSelectGenre,
  onSelectKeyword,
  onSelectPerson,
  onSelectDateRange,
  onSelectProvider,
  onSelectAvailability,
  showPeople = true,
  compact = false,
}: SearchMatchesProps) {
  const { t } = useTranslation();
  const hasPeople = showPeople && people.length > 0;
  const hasProviders = onSelectProvider !== undefined && providers.length > 0;
  if (
    !onSelectDateRange &&
    genres.length === 0 &&
    keywords.length === 0 &&
    !hasPeople &&
    !hasProviders &&
    !onSelectAvailability &&
    results.length === 0
  ) {
    return null;
  }
  return (
    <aside
      className={
        compact
          ? 'space-y-5 divide-y divide-zinc-800 [&>section:not(:last-child)]:pb-5'
          : 'space-y-3'
      }
      aria-label={t('explore.searchResults')}
    >
      {onSelectDateRange && (
        <PanelSection heading={t('catalog.releaseDate')} plain={compact}>
          <TagGroup
            type="date"
            items={discoveryDateRanges.map(({ id, label }) => ({ id, name: t(label) }))}
            onSelect={({ id, name }) => {
              onSelectDateRange(id, name);
            }}
          />
        </PanelSection>
      )}

      {genres.length > 0 && (
        <PanelSection heading={t('catalog.genreResults')} plain={compact}>
          <TagGroup
            key={genres.map(({ id }) => id).join(',')}
            type="genre"
            items={genres}
            onSelect={onSelectGenre}
          />
        </PanelSection>
      )}
      {keywords.length > 0 && (
        <PanelSection heading={t('catalog.keywordResults')} plain={compact}>
          <TagGroup
            key={keywords.map(({ id }) => id).join(',')}
            type="keyword"
            items={keywords}
            onSelect={onSelectKeyword}
          />
        </PanelSection>
      )}
      {onSelectAvailability && (
        <PanelSection heading={t('catalog.availability')} plain={compact}>
          <div className="flex flex-wrap gap-2">
            {availabilityOptions.map(({ id, label }) => (
              <DiscoveryTag
                key={id}
                type="availability"
                name={t(label)}
                onClick={() => {
                  onSelectAvailability(id, t(label));
                }}
              />
            ))}
          </div>
        </PanelSection>
      )}
      {hasPeople && (
        <MatchRail heading={t('catalog.peopleResults')} compact={compact}>
          {people.map((person) => (
            <SuggestionTile
              key={person.tmdbId}
              name={person.name}
              imagePath={person.profilePath}
              fallbackIcon="person"
              compact={compact}
              onClick={() => {
                onSelectPerson(person);
              }}
            />
          ))}
        </MatchRail>
      )}
      {hasProviders && (
        <MatchRail heading={t('catalog.providerResults')} compact={compact}>
          {providers.map((provider) => (
            <SuggestionTile
              key={provider.id}
              name={provider.name}
              imagePath={provider.logoPath}
              fallbackIcon="tv"
              containImage
              compact={compact}
              onClick={() => {
                onSelectProvider(provider);
              }}
            />
          ))}
        </MatchRail>
      )}
      {results.length > 0 && (
        <MatchRail heading={t('catalog.mediaResults')} compact={compact}>
          {results.slice(0, 14).map((media) => (
            <button
              key={`${media.type}-${media.tmdbId}`}
              type="button"
              disabled={!onSelectMedia}
              className="flex w-32 shrink-0 flex-col text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              onClick={() => onSelectMedia?.(media)}
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
        </MatchRail>
      )}
    </aside>
  );
}
