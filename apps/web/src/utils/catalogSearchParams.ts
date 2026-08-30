import { genreKeys, type GenreKey } from '@findarr/shared/constants';
import type { InteractionFilter } from '@findarr/shared/interaction';
import type { SearchType } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';

interface CatalogSearchParamDefaults {
  interaction?: InteractionFilter;
  page?: number;
  type?: SearchType;
}

interface CatalogSearchParamState {
  discoveryName?: string;
  genres: GenreKey[];
  interaction?: InteractionFilter;
  page: number;
  q: string;
  type: SearchType;
  personId?: number;
  keywordId?: number;
  genreId?: number;
}

interface CatalogSearchParamInput {
  discoveryName?: string | undefined;
  genres?: GenreKey[] | undefined;
  interaction?: InteractionFilter | undefined;
  page?: number | undefined;
  q?: string | undefined;
  type?: SearchType | undefined;
  keywordId?: number | undefined;
  personId?: number | undefined;
  genreId?: number | undefined;
}

const isInteractionFilter = (value: string): value is InteractionFilter =>
  value === 'all' || value === 'unvoted' || value === 'voted';

const isSearchType = (value: string): value is SearchType =>
  value === 'movie' || value === 'tv' || value === 'both';

const genreKeySet = new Set<string>(genreKeys);
const isGenreKey = (value: string): value is GenreKey => genreKeySet.has(value);

const readPositiveInteger = (value: string | null): number | undefined => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

export const readCatalogSearchParams = (
  searchParams: URLSearchParams,
  defaults: CatalogSearchParamDefaults = {},
): CatalogSearchParamState => {
  const rawType = searchParams.get('type');
  const rawInteraction = searchParams.get('interaction');

  const interaction =
    isDefined(rawInteraction) && isInteractionFilter(rawInteraction)
      ? rawInteraction
      : defaults.interaction;

  const personId = readPositiveInteger(searchParams.get('person'));
  const keywordId = readPositiveInteger(searchParams.get('keyword'));
  const genreId = readPositiveInteger(searchParams.get('genre'));
  const discoveryName = searchParams.get('name') ?? undefined;

  return {
    type: isDefined(rawType) && isSearchType(rawType) ? rawType : (defaults.type ?? 'both'),
    page: Math.trunc(Number(searchParams.get('page') ?? String(defaults.page ?? 1))),
    q: searchParams.get('q') ?? '',
    genres: searchParams.getAll('genres').filter((genre) => isGenreKey(genre)),
    ...(isDefined(interaction) ? { interaction } : {}),
    ...(isDefined(personId) ? { personId } : {}),
    ...(isDefined(keywordId) ? { keywordId } : {}),
    ...(isDefined(genreId) ? { genreId } : {}),
    ...(isDefined(discoveryName) ? { discoveryName } : {}),
  };
};

export const buildCatalogSearchParams = (next: CatalogSearchParamInput) => {
  const params = new URLSearchParams();

  if (isDefined(next.type)) {
    params.set('type', next.type);
  }
  if (isDefined(next.page)) {
    params.set('page', String(next.page));
  }
  if (isDefined(next.interaction)) {
    params.set('interaction', next.interaction);
  }
  if (isDefined(next.q)) {
    params.set('q', next.q);
  }
  if (isDefined(next.personId)) {
    params.set('person', String(next.personId));
  }
  if (isDefined(next.keywordId)) {
    params.set('keyword', String(next.keywordId));
  }
  if (isDefined(next.genreId)) {
    params.set('genre', String(next.genreId));
  }
  if (isDefined(next.discoveryName)) {
    params.set('name', next.discoveryName);
  }

  for (const genre of next.genres ?? []) {
    params.append('genres', genre);
  }

  return params;
};
