import { z } from 'zod';

// ============================================================================
// Catalog Request Schemas
// ============================================================================

export const WATCH_MONETIZATION_TYPES = ['flatrate', 'free', 'ads', 'rent', 'buy'] as const;
export type WatchMonetizationType = (typeof WATCH_MONETIZATION_TYPES)[number];

export type DiscoveryType = 'person' | 'genre' | 'keyword' | 'date' | 'provider' | 'availability';

type NumericDiscoveryType = Exclude<DiscoveryType, 'availability'>;

export type DiscoveryFilter =
  | { type: 'availability'; id: WatchMonetizationType; name: string }
  | {
      [Type in NumericDiscoveryType]: { type: Type; id: number; name: string };
    }[NumericDiscoveryType];

const asArray = (value: unknown): unknown[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

const positiveIds = z.preprocess(asArray, z.array(z.coerce.number().int().positive()).default([]));
const watchMonetizationTypes = z.preprocess(asArray, z.array(z.enum(WATCH_MONETIZATION_TYPES)));

export const SearchQuerySchema = z.object({
  query: z.string().min(1),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  type: z.enum(['movie', 'tv', 'both']).default('both'),
});

export const DiscoverQuerySchema = z.object({
  feedId: z.uuid().optional(),
  type: z.enum(['movie', 'tv', 'both']).default('both'),
  person: positiveIds,
  genre: positiveIds,
  keyword: positiveIds,
  provider: positiveIds,
  availability: watchMonetizationTypes,
  startDate: z.iso.date().optional(),
  endDate: z.iso.date().optional(),
});

// Snapshot-backed popular query for infinite scrolling/load-more
export const PopularQuerySchema = z.object({
  feedId: z.uuid().optional(),
  type: z.enum(['movie', 'tv', 'both']).default('both'),
});

export const DetailsQuerySchema = z.object({
  id: z.coerce.number().int().positive(),
  type: z.enum(['movie', 'tv']),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;
export type DiscoverQuery = z.infer<typeof DiscoverQuerySchema>;
export type PopularQuery = z.infer<typeof PopularQuerySchema>;
export type DetailsQuery = z.infer<typeof DetailsQuerySchema>;
