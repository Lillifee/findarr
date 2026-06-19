import { z } from 'zod';

export const JellyfinProviderIdsSchema = z.object({
  Tmdb: z.string().optional(),
  Imdb: z.string().optional(),
  Tvdb: z.string().optional(),
});

export const JellyfinItemSchema = z.object({
  Id: z.string(),
  Name: z.string(),
  Type: z.enum(['Movie', 'Series', 'Season']),
  ProviderIds: JellyfinProviderIdsSchema.optional(),
  DateCreated: z.string().optional(),
  ProductionYear: z.number().optional(),
  Overview: z.string().optional(),
  IndexNumber: z.number().optional(),
  ImageTags: z.object({ Primary: z.string().optional() }).optional(),
});

export const JellyfinItemsResponseSchema = z.object({
  Items: z.array(JellyfinItemSchema),
  TotalRecordCount: z.number(),
  StartIndex: z.number(),
});

export type JellyfinItem = z.infer<typeof JellyfinItemSchema>;
export type JellyfinItemsResponse = z.infer<typeof JellyfinItemsResponseSchema>;
