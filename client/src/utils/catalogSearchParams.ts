import type { GenreKey, InteractionFilter, SearchType } from '@findarr/shared';

interface CatalogSearchParamDefaults {
  interaction?: InteractionFilter;
  page?: number;
  recentDays?: number;
  type?: SearchType;
}

interface CatalogSearchParamState {
  genres: GenreKey[];
  interaction?: InteractionFilter;
  page: number;
  q: string;
  recentDays?: number;
  type: SearchType;
}

interface CatalogSearchParamInput {
  genres?: GenreKey[] | undefined;
  interaction?: InteractionFilter | undefined;
  page?: number | undefined;
  q?: string | undefined;
  recentDays?: number | undefined;
  type?: SearchType | undefined;
}

export const readCatalogSearchParams = (
  searchParams: URLSearchParams,
  defaults: CatalogSearchParamDefaults = {}
): CatalogSearchParamState => {
  const interaction =
    (searchParams.get('interaction') as InteractionFilter | null) ?? defaults.interaction;
  const recentDays =
    searchParams.get('recentDays') === null
      ? defaults.recentDays
      : Number.parseInt(searchParams.get('recentDays') || String(defaults.recentDays ?? 365), 10);

  return {
    type: (searchParams.get('type') as SearchType | null) ?? defaults.type ?? 'both',
    page: Number.parseInt(searchParams.get('page') || String(defaults.page ?? 1), 10),
    ...(recentDays === undefined ? {} : { recentDays }),
    ...(interaction === undefined ? {} : { interaction }),
    q: searchParams.get('q') || '',
    genres: searchParams.getAll('genres') as GenreKey[],
  };
};

export const buildCatalogSearchParams = (next: CatalogSearchParamInput) => {
  const params = new URLSearchParams();

  if (next.type) {
    params.set('type', next.type);
  }
  if (typeof next.page === 'number') {
    params.set('page', String(next.page));
  }
  if (typeof next.recentDays === 'number') {
    params.set('recentDays', String(next.recentDays));
  }
  if (next.interaction) {
    params.set('interaction', next.interaction);
  }
  if (next.q) {
    params.set('q', next.q);
  }

  for (const genre of next.genres ?? []) {
    params.append('genres', genre);
  }

  return params;
};
