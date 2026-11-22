import {
  WATCH_MONETIZATION_TYPES,
  type DiscoveryFilter,
  type DiscoveryType,
} from '@findarr/shared/catalog';
import type { SearchType } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';

import { discoveryDateRanges } from './discoveryDateRanges';

export type { DiscoveryFilter, DiscoveryType } from '@findarr/shared/catalog';
export type DiscoveryEntityType = Exclude<DiscoveryType, 'date' | 'availability'>;

interface CatalogSearchParamDefaults {
  page?: number;
  type?: SearchType;
}

interface CatalogSearchParamState {
  discoveryName?: string;
  page: number;
  q: string;
  type: SearchType;
  discovery?: DiscoveryFilter[];
}

interface CatalogSearchParamInput {
  discoveryName?: string | undefined;
  page?: number | undefined;
  q?: string | undefined;
  type?: SearchType | undefined;
  discovery?: DiscoveryFilter[] | undefined;
}

const isSearchType = (value: string): value is SearchType =>
  value === 'movie' || value === 'tv' || value === 'both';

const readPositiveInteger = (value: string | null): number | undefined => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

export const DISCOVERY_TYPES: readonly DiscoveryType[] = [
  'genre',
  'person',
  'keyword',
  'date',
  'provider',
  'availability',
];

export function isDiscoveryType(value: unknown): value is DiscoveryType {
  return typeof value === 'string' && (DISCOVERY_TYPES as readonly string[]).includes(value);
}

export function parseDiscoveryType(raw: unknown): DiscoveryType | undefined {
  return isDiscoveryType(raw) ? raw : undefined;
}

export function addDiscoveryFilter(
  discovery: DiscoveryFilter[] | undefined,
  filter: DiscoveryFilter,
): DiscoveryFilter[] {
  if (filter.type === 'date') {
    return [...(discovery ?? []).filter((item) => item.type !== 'date'), filter];
  }

  return (discovery?.some((item) => item.type === filter.type && item.id === filter.id) ?? false)
    ? (discovery ?? [])
    : [...(discovery ?? []), filter];
}

export const readCatalogSearchParams = (
  searchParams: URLSearchParams,
  defaults: CatalogSearchParamDefaults = {},
): CatalogSearchParamState => {
  const rawType = searchParams.get('type');

  const discovery: DiscoveryFilter[] = [];
  for (const type of DISCOVERY_TYPES) {
    const names = searchParams.getAll(`${type}Name`);
    for (const [index, value] of searchParams.getAll(type).entries()) {
      const name = names[index] ?? `${type} ${value}`;
      if (type === 'availability') {
        const id = WATCH_MONETIZATION_TYPES.find((availability) => availability === value);
        if (isDefined(id)) {
          discovery.push({ type, id, name });
        }
        continue;
      }

      const id = readPositiveInteger(value);
      if (
        isDefined(id) &&
        (type !== 'date' || discoveryDateRanges.some((preset) => preset.id === id))
      ) {
        discovery.push({ type, id, name });
      }
    }
  }
  return {
    type: isDefined(rawType) && isSearchType(rawType) ? rawType : (defaults.type ?? 'both'),
    page: Math.trunc(Number(searchParams.get('page') ?? String(defaults.page ?? 1))),
    q: searchParams.get('q') ?? '',
    ...(discovery.length > 0 ? { discovery } : {}),
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
  if (isDefined(next.q)) {
    params.set('q', next.q);
  }
  if (isDefined(next.discovery)) {
    for (const discovery of next.discovery) {
      params.append(discovery.type, String(discovery.id));
      params.append(`${discovery.type}Name`, discovery.name);
    }
  }

  return params;
};
