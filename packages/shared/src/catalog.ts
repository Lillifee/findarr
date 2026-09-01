import { z } from 'zod';

// ============================================================================
// Catalog Request Schemas
// ============================================================================

export type DiscoveryType = 'person' | 'genre' | 'keyword';

export interface DiscoveryFilter {
  type: DiscoveryType;
  id: number;
  name: string;
}

const asArray = (value: unknown): unknown[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

const positiveIds = z.preprocess(asArray, z.array(z.coerce.number().int().positive()).default([]));

export const SearchQuerySchema = z.object({
  query: z.string().min(1),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  type: z.enum(['movie', 'tv', 'both']).default('both'),
});

export const DiscoverQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  type: z.enum(['movie', 'tv', 'both']).default('both'),
  person: positiveIds,
  genre: positiveIds,
  keyword: positiveIds,
});

// Snapshot-backed popular query for infinite scrolling/load-more
export const PopularQuerySchema = z.object({
  feedId: z.uuid().optional(),
  page: z.coerce.number().int().min(1).max(1000).optional(),
  type: z.enum(['movie', 'tv', 'both']).optional(),

  interaction: z.enum(['all', 'unvoted', 'voted']).optional(),
});

export const DetailsQuerySchema = z.object({
  id: z.coerce.number().int().positive(),
  type: z.enum(['movie', 'tv']),
});

export const GenresQuerySchema = z.object({});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;
export type DiscoverQuery = z.infer<typeof DiscoverQuerySchema>;
export type PopularQuery = z.infer<typeof PopularQuerySchema>;
export type DetailsQuery = z.infer<typeof DetailsQuerySchema>;
export type GenresQuery = z.infer<typeof GenresQuerySchema>;
