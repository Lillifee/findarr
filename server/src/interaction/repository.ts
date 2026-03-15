import type {
  Media,
  InteractionType,
  MediaInteraction,
  MediaInteractionWithUser,
  DbMedia,
} from '@findarr/shared';
import { isDefined, media, userMediaInteractions } from '@findarr/shared';
import { and, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import type { DB } from '../db/setup.js';

// ============================================================================
// Basic CRUD Operations
// ============================================================================

/**
 * Add a user interaction with media (liked, disliked)
 */
export async function addInteraction(
  db: DB,
  userId: number,
  mediaId: number,
  action: InteractionType
): Promise<void> {
  await db
    .insert(userMediaInteractions)
    .values({
      userId,
      mediaId,
      action,
    })
    .onConflictDoNothing();
}

/**
 * Check if a user has a specific interaction with media
 */
export async function hasInteraction(
  db: DB,
  userId: number,
  mediaId: number,
  action: InteractionType
): Promise<boolean> {
  const result = await db.query.userMediaInteractions.findFirst({
    where: and(
      eq(userMediaInteractions.userId, userId),
      eq(userMediaInteractions.mediaId, mediaId),
      eq(userMediaInteractions.action, action)
    ),
    columns: { id: true },
  });

  return isDefined(result);
}

/**
 * Remove all interactions for a user on a specific media
 */
export async function removeAllInteractions(
  db: DB,
  userId: number,
  mediaId: number
): Promise<void> {
  await db
    .delete(userMediaInteractions)
    .where(
      and(eq(userMediaInteractions.userId, userId), eq(userMediaInteractions.mediaId, mediaId))
    );
}

// ============================================================================
// Batch Query Operations - Optimized queries for enriching multiple items
// ============================================================================

/**
 * Batch query for user interactions on multiple media items
 * Used for enriching media arrays with user-specific interaction state
 */
export async function getInteractionsBatch(
  db: DB,
  mediaItems: Media[],
  userId: number
): Promise<Map<number, MediaInteraction[]>> {
  const interactionsMap = new Map<number, MediaInteraction[]>();

  // Extract media IDs from items that have records
  const mediaIds = mediaItems.map(item => item.state?.record?.id).filter(x => isDefined(x));
  if (mediaIds.length === 0) return interactionsMap;

  const rows = await db.query.userMediaInteractions.findMany({
    columns: {
      id: true,
      mediaId: true,
      action: true,
      createdAt: true,
    },
    where: and(
      eq(userMediaInteractions.userId, userId),
      inArray(userMediaInteractions.mediaId, mediaIds)
    ),
  });

  for (const { mediaId, id, action, createdAt } of rows) {
    const interactions = interactionsMap.get(mediaId) || [];
    interactions.push({ id, action, createdAt });
    interactionsMap.set(mediaId, interactions);
  }

  return interactionsMap;
}

/**
 * Batch query for ALL interactions on multiple media items with user info
 * Used for admin views that show all user interactions
 */
export async function getAllInteractionsWithUsersBatch(
  db: DB,
  mediaItems: Media[]
): Promise<Map<number, Array<MediaInteractionWithUser>>> {
  const allInteractionsMap = new Map<number, Array<MediaInteractionWithUser>>();

  const mediaIds = mediaItems.map(item => item.state?.record?.id).filter(x => isDefined(x));
  if (mediaIds.length === 0) return allInteractionsMap;

  const results = await db.query.media.findMany({
    columns: { id: true },
    where: inArray(media.id, mediaIds),
    with: {
      interactions: {
        columns: {
          id: true,
          action: true,
          createdAt: true,
        },
        with: {
          user: {
            columns: {
              id: true,
              email: true,
              displayName: true,
              createdAt: true,
            },
          },
        },
        orderBy: (interactions, { desc }) => [desc(interactions.createdAt)],
      },
    },
  });

  for (const mediaRecord of results) {
    allInteractionsMap.set(mediaRecord.id, mediaRecord.interactions);
  }

  return allInteractionsMap;
}

/**
 * Batch query for vote counts on multiple media items
 * Returns aggregated like and dislike counts for all media
 */
export async function getVoteCountsBatch(
  db: DB,
  mediaItems: Media[]
): Promise<Map<number, { likes: number; dislikes: number }>> {
  const votesMap = new Map<number, { likes: number; dislikes: number }>();

  const mediaIds = mediaItems.map(item => item.state?.record?.id).filter(x => isDefined(x));
  if (mediaIds.length === 0) return votesMap;

  const rows = await db
    .select({
      mediaId: userMediaInteractions.mediaId,
      likes: sql<number>`SUM(CASE WHEN ${userMediaInteractions.action} = 'liked' THEN 1 ELSE 0 END)`,
      dislikes: sql<number>`SUM(CASE WHEN ${userMediaInteractions.action} = 'disliked' THEN 1 ELSE 0 END)`,
    })
    .from(userMediaInteractions)
    .where(inArray(userMediaInteractions.mediaId, mediaIds))
    .groupBy(userMediaInteractions.mediaId);

  for (const { mediaId, likes, dislikes } of rows) {
    votesMap.set(mediaId, { likes: likes || 0, dislikes: dislikes || 0 });
  }

  return votesMap;
}

// ============================================================================
// Query Operations - Fetch media by interaction criteria
// ============================================================================

/**
 * Get all media records where a user has ANY interaction (liked or disliked)
 * Returns the media DB rows ordered by interaction creation time (most recent first)
 */
export async function getMediaByUserInteractions(db: DB, userId: number): Promise<DbMedia[]> {
  return await db
    .selectDistinct({
      id: media.id,
      tmdbId: media.tmdbId,
      type: media.type,
      jellyfinId: media.jellyfinId,
      status: media.status,
      createdAt: media.createdAt,
      updatedAt: media.updatedAt,
    })
    .from(media)
    .innerJoin(userMediaInteractions, eq(media.id, userMediaInteractions.mediaId))
    .where(eq(userMediaInteractions.userId, userId))
    .orderBy(desc(userMediaInteractions.createdAt));
}

/**
 * Get all media records where a user has a specific interaction
 * Returns the media DB rows ordered by interaction creation time (most recent first)
 */
export async function getMediaByUserInteraction(
  db: DB,
  userId: number,
  action: InteractionType
): Promise<DbMedia[]> {
  const results = await db.query.userMediaInteractions.findMany({
    where: and(eq(userMediaInteractions.userId, userId), eq(userMediaInteractions.action, action)),
    with: { media: true },
    orderBy: (interactions, { desc }) => [desc(interactions.createdAt), desc(interactions.id)],
  });

  return results.map(r => r.media);
}

/**
 * Get all media records that have a specific interaction from any user
 * Returns distinct media records ordered by media creation time (most recent first)
 */
export async function getMediaByInteraction(db: DB, action: InteractionType): Promise<DbMedia[]> {
  const rows = await db
    .selectDistinct({
      id: media.id,
      tmdbId: media.tmdbId,
      type: media.type,
      jellyfinId: media.jellyfinId,
      status: media.status,
      createdAt: media.createdAt,
      updatedAt: media.updatedAt,
    })
    .from(media)
    .innerJoin(userMediaInteractions, eq(media.id, userMediaInteractions.mediaId))
    .where(eq(userMediaInteractions.action, action))
    .orderBy(desc(media.createdAt));

  return rows;
}

/**
 * Get all media records with interactions (pending or requested status)
 * Excludes available media that came from Jellyfin sync
 * Returns media ordered by creation time (most recent first)
 */
export async function getAllMediaWithInteractions(db: DB): Promise<DbMedia[]> {
  return await db.query.media.findMany({
    where: ne(media.status, 'available'),
    orderBy: (media, { desc }) => [desc(media.createdAt)],
  });
}

// ============================================================================
// Vote Counting & Aggregation
// ============================================================================

/**
 * Get vote counts for a specific media by internal media ID
 * Returns like count and dislike count
 */
export async function getVoteCounts(
  db: DB,
  mediaId: number
): Promise<{ likes: number; dislikes: number }> {
  const result = await db
    .select({
      likes: sql<number>`SUM(CASE WHEN ${userMediaInteractions.action} = 'liked' THEN 1 ELSE 0 END)`,
      dislikes: sql<number>`SUM(CASE WHEN ${userMediaInteractions.action} = 'disliked' THEN 1 ELSE 0 END)`,
    })
    .from(userMediaInteractions)
    .where(eq(userMediaInteractions.mediaId, mediaId));

  const likes = result[0]?.likes || 0;
  const dislikes = result[0]?.dislikes || 0;

  return { likes, dislikes };
}
