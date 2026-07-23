import { z } from 'zod';

// ============================================================================
// Interaction Types
// ============================================================================

export type InteractionType = 'liked' | 'disliked';
export type InteractionFilter = 'all' | 'unvoted' | 'voted';

// ============================================================================
// Interaction Schemas
// ============================================================================

export const CreateInteractionSchema = z.object({
  mediaType: z.enum(['movie', 'tv']),
  tmdbId: z.coerce.number().int().positive(),
  action: z.enum(['liked', 'disliked']),
  seasons: z.array(z.number().int().min(0)).optional(),
});

export const InteractionIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const InteractionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1).optional(),
  action: z.enum(['all', 'liked', 'disliked']).default('all').optional(),
  userId: z.coerce.number().int().positive().optional(),
  statuses: z
    .preprocess(
      (value) => (typeof value === 'string' ? [value] : value),
      z.array(
        z.enum([
          'none',
          'voted',
          'pending',
          'requested',
          'downloading',
          'downloaded',
          'available',
          'warning',
        ]),
      ),
    )
    .optional(),
  type: z.enum(['movie', 'tv', 'both']).default('both').optional(),
});

export const AvailableMediaQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1).optional(),
  type: z.enum(['movie', 'tv', 'both']).default('both').optional(),
});

export type CreateMediaInteraction = z.infer<typeof CreateInteractionSchema>;
export type InteractionsQuery = z.infer<typeof InteractionsQuerySchema>;
export type AvailableMediaQuery = z.infer<typeof AvailableMediaQuerySchema>;
