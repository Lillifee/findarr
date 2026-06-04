import { z } from 'zod';

import { genreKeys } from './constants.js';

// ============================================================================
// Catalog Request Schemas
// ============================================================================

const arrayParam = <T extends z.ZodType>(schema: T) =>
  z.preprocess((val) => {
    if (typeof val === 'string') {
      return val ? [val] : [];
    }
    if (Array.isArray(val)) {
      return val as unknown[];
    }
    return [];
  }, schema);

const BaseQuerySchema = z.object({
  language: z.string().optional(),
});

const CatalogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).optional(),
  type: z.enum(['movie', 'tv', 'both']).optional(),

  // Genre filtering
  genres: arrayParam(z.array(z.enum(genreKeys)))
    .default([])
    .optional(),
});

export const SearchQuerySchema = BaseQuerySchema.extend({
  query: z.string().min(1),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  type: z.enum(['movie', 'tv', 'both']).default('both'),
});

// Application-level discover query (clean, minimal)
export const DiscoverQuerySchema = CatalogQuerySchema.extend({
  // Recent content filter - number of days to look back
  recentDays: z.coerce.number().int().min(1).max(3650).optional(),
});

// Snapshot-backed popular query for infinite scrolling/load-more
export const PopularQuerySchema = CatalogQuerySchema.extend({
  feedId: z.uuid().optional(),
  interaction: z.enum(['all', 'unvoted', 'voted']).optional(),
});

export const DetailsQuerySchema = BaseQuerySchema.extend({
  id: z.coerce.number().int().positive(),
  type: z.enum(['movie', 'tv']),
});

export const GenresQuerySchema = z.object({});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;
export type DiscoverQuery = z.infer<typeof DiscoverQuerySchema>;
export type PopularQuery = z.infer<typeof PopularQuerySchema>;
export type DetailsQuery = z.infer<typeof DetailsQuerySchema>;
export type GenresQuery = z.infer<typeof GenresQuerySchema>;
