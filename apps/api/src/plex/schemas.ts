import { z } from 'zod';

// Plex server identity response
export const PlexIdentitySchema = z.object({
  MediaContainer: z.object({
    machineIdentifier: z.string(),
  }),
});

// Plex GUID (external service mappings like tmdb://12345)
export const PlexGuidSchema = z.object({
  id: z.string(),
});

// Plex Metadata item (movie or show)
export const PlexMetadataItemSchema = z.object({
  ratingKey: z.string(),
  type: z.enum(['movie', 'show', 'season']),
  title: z.string(),
  Guid: z.array(PlexGuidSchema).optional(),
  addedAt: z.number().optional(),
  index: z.number().optional(),
});

// Plex MediaContainer response
export const PlexMediaContainerSchema = z.object({
  MediaContainer: z.object({
    Metadata: z.array(PlexMetadataItemSchema).optional(),
    TotalSize: z.number().optional(),
    size: z.number().optional(),
  }),
});

// Plex library section
export const PlexSectionSchema = z.object({
  key: z.string(),
  type: z.enum(['movie', 'show']),
  title: z.string(),
});

export const PlexSectionsResponseSchema = z.object({
  MediaContainer: z.object({
    Directory: z.array(PlexSectionSchema).optional(),
  }),
});

export type PlexMetadataItem = z.infer<typeof PlexMetadataItemSchema>;
export type PlexMediaContainer = z.infer<typeof PlexMediaContainerSchema>;
export type PlexSection = z.infer<typeof PlexSectionSchema>;
