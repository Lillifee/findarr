import type { WatchMonetizationType } from '@findarr/shared/catalog';
import type { Genre, Keyword, Media, Person, Provider } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { discoveryDateRanges } from '../../utils/discoveryDateRanges';
import { tmdbImage } from '../../utils/tmdb';
import { HorizontalRail } from '../ui/HorizontalRail';
import { Icon, type IconName } from '../ui/Icon';
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
  return (
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
  );
}

interface SearchFilterCategory {
  id: string;
  heading: string;
  icon: IconName;
  content: ReactNode;
}

function FilterCategoryButton({
  category,
  selected,
  onClick,
}: {
  category: SearchFilterCategory;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex min-h-12 items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 ${
        selected
          ? 'border-amber-500 bg-amber-500/10 text-amber-200'
          : 'border-zinc-800 bg-zinc-900/35 text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800/70'
      }`}
    >
      <Icon
        name={category.icon}
        size="sm"
        className={selected ? 'text-amber-300' : 'text-zinc-400'}
      />
      <span>{category.heading}</span>
    </button>
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
  onSelectMedia: (media: Media) => void;
  onSelectGenre: (genre: Genre) => void;
  onSelectKeyword: (keyword: Keyword) => void;
  onSelectPerson: (person: Person) => void;
  onSelectDateRange: (id: number, name: string) => void;
  onSelectProvider: (provider: Provider) => void;
  onSelectAvailability: (availability: WatchMonetizationType, name: string) => void;
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
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string | null>(null);
  const hasPeople = showPeople && people.length > 0;
  const hasProviders = providers.length > 0;
  const filterCategories: SearchFilterCategory[] = [
    {
      id: 'date',
      heading: t('catalog.releaseDate'),
      icon: 'calendar_month',
      content: (
        <PanelSection heading={t('catalog.releaseDate')} plain={compact}>
          <TagGroup
            type="date"
            items={discoveryDateRanges.map(({ id, label }) => ({ id, name: t(label) }))}
            onSelect={({ id, name }) => {
              onSelectDateRange(id, name);
            }}
          />
        </PanelSection>
      ),
    },
  ];
  if (genres.length > 0) {
    filterCategories.push({
      id: 'genre',
      heading: t('catalog.genreResults'),
      icon: 'theater_comedy',
      content: (
        <PanelSection heading={t('catalog.genreResults')} plain={compact}>
          <TagGroup
            key={genres.map(({ id }) => id).join(',')}
            type="genre"
            items={genres}
            onSelect={onSelectGenre}
          />
        </PanelSection>
      ),
    });
  }
  if (keywords.length > 0) {
    filterCategories.push({
      id: 'keyword',
      heading: t('catalog.keywordResults'),
      icon: 'sell',
      content: (
        <PanelSection heading={t('catalog.keywordResults')} plain={compact}>
          <TagGroup
            key={keywords.map(({ id }) => id).join(',')}
            type="keyword"
            items={keywords}
            onSelect={onSelectKeyword}
          />
        </PanelSection>
      ),
    });
  }
  filterCategories.push({
    id: 'availability',
    heading: t('catalog.availability'),
    icon: 'tv',
    content: (
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
    ),
  });
  if (hasPeople) {
    filterCategories.push({
      id: 'people',
      heading: t('catalog.peopleResults'),
      icon: 'group',
      content: (
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
      ),
    });
  }
  if (hasProviders) {
    filterCategories.push({
      id: 'providers',
      heading: t('catalog.providerResults'),
      icon: 'tv',
      content: (
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
      ),
    });
  }
  const activeFilterCategory = filterCategories.find(({ id }) => id === selectedFilterCategory);
  if (filterCategories.length === 0 && results.length === 0) {
    return null;
  }
  return (
    <aside className="space-y-3" aria-label={t('explore.searchResults')}>
      {filterCategories.length > 0 && (
        <div
          className={compact ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-1 gap-2 sm:grid-cols-2'}
        >
          {filterCategories.map((category) => (
            <FilterCategoryButton
              key={category.id}
              category={category}
              selected={activeFilterCategory?.id === category.id}
              onClick={() => {
                setSelectedFilterCategory((current) =>
                  current === category.id ? null : category.id,
                );
              }}
            />
          ))}
        </div>
      )}
      {activeFilterCategory?.content}
      {results.length > 0 && (
        <MatchRail heading={t('catalog.mediaResults')} compact={compact}>
          {results.slice(0, 14).map((media) => (
            <button
              key={`${media.type}-${media.tmdbId}`}
              type="button"
              className="flex w-32 shrink-0 flex-col text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              onClick={() => {
                onSelectMedia(media);
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
        </MatchRail>
      )}
    </aside>
  );
}
