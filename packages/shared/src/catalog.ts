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

export const SearchQuerySchema = z.object({
  query: z.string().min(1),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  type: z.enum(['movie', 'tv', 'both']).default('both'),
});

// Snapshot-backed popular query for infinite scrolling/load-more
export const PopularQuerySchema = z.object({
  feedId: z.uuid().optional(),
  page: z.coerce.number().int().min(1).max(1000).optional(),
  type: z.enum(['movie', 'tv', 'both']).optional(),
  genres: arrayParam(z.array(z.enum(genreKeys)))
    .default([])
    .optional(),

  interaction: z.enum(['all', 'unvoted', 'voted']).optional(),
});

export const DetailsQuerySchema = z.object({
  id: z.coerce.number().int().positive(),
  type: z.enum(['movie', 'tv']),
});

export const GenresQuerySchema = z.object({});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;
export type PopularQuery = z.infer<typeof PopularQuerySchema>;
export type DetailsQuery = z.infer<typeof DetailsQuerySchema>;
export type GenresQuery = z.infer<typeof GenresQuerySchema>;
