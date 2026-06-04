import type { GenreKey } from '@findarr/shared/constants';
import type { InteractionFilter } from '@findarr/shared/interaction';
import type { SearchType } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';

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
  defaults: CatalogSearchParamDefaults = {},
): CatalogSearchParamState => {
  // TODO fix typings
  const interaction =
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    (searchParams.get('interaction') as InteractionFilter | null) ?? defaults.interaction;

  return {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    type: (searchParams.get('type') as SearchType | undefined) ?? defaults.type ?? 'both',
    page: Number.parseInt(searchParams.get('page') ?? String(defaults.page ?? 1), 10),
    ...(interaction === undefined ? {} : { interaction }),
    q: searchParams.get('q') ?? '',
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
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
  if (isDefined(next.q)) {
    params.set('q', next.q);
  }

  for (const genre of next.genres ?? []) {
    params.append('genres', genre);
  }

  return params;
};
