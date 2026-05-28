import type { GenreKey, InteractionFilter, SearchType } from '@findarr/shared';

interface CatalogSearchParamDefaults {
  interaction?: InteractionFilter;
  page?: number;
  type?: SearchType;
}

interface CatalogSearchParamState {
  genres: GenreKey[];
  interaction?: InteractionFilter;
  page: number;
  q: string;
  type: SearchType;
}

interface CatalogSearchParamInput {
  genres?: GenreKey[] | undefined;
  interaction?: InteractionFilter | undefined;
  page?: number | undefined;
  q?: string | undefined;
  type?: SearchType | undefined;
}

export const readCatalogSearchParams = (
  searchParams: URLSearchParams,
  defaults: CatalogSearchParamDefaults = {}
): CatalogSearchParamState => {
  const interaction =
    (searchParams.get('interaction') as InteractionFilter | null) ??
    defaults.interaction;

  return {
    type:
      (searchParams.get('type') as SearchType | null) ??
      defaults.type ??
      'both',
    page: Number.parseInt(
      searchParams.get('page') || String(defaults.page ?? 1),
      10
    ),
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
