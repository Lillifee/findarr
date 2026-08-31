import type { InteractionFilter } from '@findarr/shared/interaction';
import type { SearchType } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';

export type DiscoveryType = 'person' | 'genre' | 'keyword';

export interface DiscoveryFilter {
  type: DiscoveryType;
  id: number;
  name: string;
}

interface CatalogSearchParamDefaults {
  interaction?: InteractionFilter;
  page?: number;
  type?: SearchType;
}

interface CatalogSearchParamState {
  discoveryName?: string;
  interaction?: InteractionFilter;
  page: number;
  q: string;
  type: SearchType;
  discovery?: DiscoveryFilter;
}

interface CatalogSearchParamInput {
  discoveryName?: string | undefined;
  interaction?: InteractionFilter | undefined;
  page?: number | undefined;
  q?: string | undefined;
  type?: SearchType | undefined;
  discovery?: DiscoveryFilter | undefined;
}

const isInteractionFilter = (value: string): value is InteractionFilter =>
  value === 'all' || value === 'unvoted' || value === 'voted';

const isSearchType = (value: string): value is SearchType =>
  value === 'movie' || value === 'tv' || value === 'both';

const readPositiveInteger = (value: string | null): number | undefined => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

export const DISCOVERY_TYPES: readonly DiscoveryType[] = ['person', 'genre', 'keyword'] as const;

export function isDiscoveryType(value: unknown): value is DiscoveryType {
  return typeof value === 'string' && (DISCOVERY_TYPES as readonly string[]).includes(value);
}

export function parseDiscoveryType(raw: unknown): DiscoveryType | undefined {
  return isDiscoveryType(raw) ? raw : undefined;
}

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

  const rawDiscoveryType = searchParams.get('discoverType');
  const discoveryId = readPositiveInteger(searchParams.get('discoverId'));
  const discoveryType: DiscoveryType | undefined = parseDiscoveryType(rawDiscoveryType);
  const discoveryName = searchParams.get('name') ?? undefined;

  return {
    type: isDefined(rawType) && isSearchType(rawType) ? rawType : (defaults.type ?? 'both'),
    page: Math.trunc(Number(searchParams.get('page') ?? String(defaults.page ?? 1))),
    q: searchParams.get('q') ?? '',
    ...(isDefined(interaction) ? { interaction } : {}),
    ...(isDefined(discoveryType) && isDefined(discoveryId) && isDefined(discoveryName)
      ? { discovery: { type: discoveryType, id: discoveryId, name: discoveryName } }
      : {}),
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
  if (isDefined(next.discovery)) {
    params.set('discoverType', next.discovery.type);
    params.set('discoverId', String(next.discovery.id));
    params.set('name', next.discovery.name);
  }

  return params;
};
