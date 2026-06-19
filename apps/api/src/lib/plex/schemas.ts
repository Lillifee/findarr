import { z } from 'zod';

export const PlexIdentitySchema = z.object({
  MediaContainer: z.object({ machineIdentifier: z.string() }),
});

export const PlexGuidSchema = z.object({ id: z.string() });

export const PlexMetadataItemSchema = z.object({
  ratingKey: z.string(),
  type: z.enum(['movie', 'show', 'season']),
  title: z.string(),
  Guid: z.array(PlexGuidSchema).optional(),
  addedAt: z.number().optional(),
  index: z.number().optional(),
});

export const PlexMediaContainerSchema = z.object({
  MediaContainer: z.object({
    Metadata: z.array(PlexMetadataItemSchema).optional(),
    totalSize: z.number().optional(),
    size: z.number().optional(),
  }),
});

export const PlexSectionSchema = z.object({
  key: z.string(),
  type: z.enum(['movie', 'show']),
  title: z.string(),
});

export const PlexSectionsResponseSchema = z.object({
  MediaContainer: z.object({ Directory: z.array(PlexSectionSchema).optional() }),
});

export type PlexMetadataItem = z.infer<typeof PlexMetadataItemSchema>;
export type PlexSection = z.infer<typeof PlexSectionSchema>;
