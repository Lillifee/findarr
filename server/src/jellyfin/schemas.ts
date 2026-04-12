import { z } from 'zod';

// Jellyfin Provider IDs (external service mappings)
export const JellyfinProviderIdsSchema = z.object({
  Tmdb: z.string().optional(),
  Imdb: z.string().optional(),
  Tvdb: z.string().optional(),
});

// Jellyfin Item (movie, show, or season)
export const JellyfinItemSchema = z.object({
  Id: z.string(),
  Name: z.string(),
  Type: z.enum(['Movie', 'Series', 'Season']),
  ProviderIds: JellyfinProviderIdsSchema.optional(),
  ProductionYear: z.number().optional(),
  Overview: z.string().optional(),
  IndexNumber: z.number().optional(), // Season number for Season type
  ImageTags: z
    .object({
      Primary: z.string().optional(),
    })
    .optional(),
});

// Jellyfin Items API Response
export const JellyfinItemsResponseSchema = z.object({
  Items: z.array(JellyfinItemSchema),
  TotalRecordCount: z.number(),
  StartIndex: z.number(),
});

// Exported types
export type JellyfinItem = z.infer<typeof JellyfinItemSchema>;
export type JellyfinItemsResponse = z.infer<typeof JellyfinItemsResponseSchema>;
export type JellyfinProviderIds = z.infer<typeof JellyfinProviderIdsSchema>;
