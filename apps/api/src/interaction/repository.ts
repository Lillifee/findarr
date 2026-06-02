import type {
  Media,
  InteractionType,
  MediaInteraction,
  DbMedia,
  InteractionsQuery,
  MediaStatus,
} from '@findarr/shared';
import { isDefined, media, userMediaInteractions } from '@findarr/shared';
import { and, desc, eq, getTableColumns, inArray, isNotNull, sql } from 'drizzle-orm';

import type { Database } from '../db/service.js';
import { toMediaKey } from '../utils/helper.js';

// ============================================================================
// Basic CRUD Operations
// ============================================================================

/**
 * Add a user interaction with media (liked, disliked)
 */
export async function addInteraction(
  db: Database,
  userId: number,
  mediaId: number,
  action: InteractionType,
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
  db: Database,
  userId: number,
  mediaId: number,
  action: InteractionType,
): Promise<boolean> {
  const result = await db.query.userMediaInteractions.findFirst({
    where: and(
      eq(userMediaInteractions.userId, userId),
      eq(userMediaInteractions.mediaId, mediaId),
      eq(userMediaInteractions.action, action),
    ),
    columns: { id: true },
  });

  return isDefined(result);
}

/**
 * Remove all interactions for a user on a specific media
 */
export async function removeAllInteractions(
  db: Database,
  userId: number,
  mediaId: number,
): Promise<void> {
  await db
    .delete(userMediaInteractions)
    .where(
      and(eq(userMediaInteractions.userId, userId), eq(userMediaInteractions.mediaId, mediaId)),
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
  db: Database,
  mediaItems: Media[],
  userId: number,
): Promise<Map<number, MediaInteraction[]>> {
  const interactionsMap = new Map<number, MediaInteraction[]>();

  // Extract media IDs from items that have records
  const mediaIds = mediaItems.map((item) => item.state?.record?.id).filter((x) => isDefined(x));
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
      inArray(userMediaInteractions.mediaId, mediaIds),
    ),
  });

  for (const { mediaId, id, action, createdAt } of rows) {
    const interactions = interactionsMap.get(mediaId) ?? [];
    interactions.push({ id, action, createdAt });
    interactionsMap.set(mediaId, interactions);
  }

  return interactionsMap;
}

/**
 * Batch query for vote counts on multiple media items
 * Returns aggregated like and dislike counts for all media
 */
export async function getVoteCountsBatch(
  db: Database,
  mediaItems: Media[],
): Promise<Map<number, { likes: number; dislikes: number }>> {
  const votesMap = new Map<number, { likes: number; dislikes: number }>();

  const mediaIds = mediaItems.map((item) => item.state?.record?.id).filter((x) => isDefined(x));
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
 * Supports pagination with limit and offset
 */
export async function getMediaByUserInteractions(
  db: Database,
  userId: number,
  options: {
    type?: InteractionsQuery['type'];
    action?: InteractionsQuery['action'];
    limit?: number;
    offset?: number;
  } = {},
): Promise<{ results: DbMedia[]; totalCount: number }> {
  const conditions = [eq(userMediaInteractions.userId, userId)];

  if (options.type && options.type !== 'both') {
    conditions.push(eq(media.type, options.type));
  }

  if (options.action && options.action !== 'all') {
    conditions.push(eq(userMediaInteractions.action, options.action));
  }

  const whereClause = and(...conditions);

  const countResult = await db
    .select({ count: sql<number>`count(distinct ${media.id})` })
    .from(media)
    .innerJoin(userMediaInteractions, eq(media.id, userMediaInteractions.mediaId))
    .where(whereClause);

  const totalCount = countResult[0]?.count ?? 0;

  let query = db
    .selectDistinct(getTableColumns(media))
    .from(media)
    .innerJoin(userMediaInteractions, eq(media.id, userMediaInteractions.mediaId))
    .where(whereClause)
    .orderBy(desc(userMediaInteractions.createdAt), desc(media.updatedAt));

  // TODO fix typings
  if (options.limit !== undefined) {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    query = query.limit(options.limit) as typeof query;
  }
  if (options.offset !== undefined) {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    query = query.offset(options.offset) as typeof query;
  }

  const results = await query;

  return { results, totalCount };
}

export async function getMediaByUserAttention(
  db: Database,
  userId: number,
  options: {
    type?: InteractionsQuery['type'];
    statuses: MediaStatus[];
    limit?: number;
    offset?: number;
  },
): Promise<{ results: DbMedia[]; totalCount: number }> {
  const conditions = [eq(userMediaInteractions.userId, userId)];

  if (options.type && options.type !== 'both') {
    conditions.push(eq(media.type, options.type));
  }

  if (options.statuses.length === 0) {
    return { results: [], totalCount: 0 };
  }

  conditions.push(inArray(media.status, options.statuses));

  const whereClause = and(...conditions);

  const countResult = await db
    .select({ count: sql<number>`count(distinct ${media.id})` })
    .from(media)
    .innerJoin(userMediaInteractions, eq(media.id, userMediaInteractions.mediaId))
    .where(whereClause);

  const totalCount = countResult[0]?.count ?? 0;

  let query = db
    .selectDistinct(getTableColumns(media))
    .from(media)
    .innerJoin(userMediaInteractions, eq(media.id, userMediaInteractions.mediaId))
    .where(whereClause)
    .orderBy(desc(userMediaInteractions.createdAt), desc(media.updatedAt));

  // TODO fix typings
  if (options.limit !== undefined) {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    query = query.limit(options.limit) as typeof query;
  }
  if (options.offset !== undefined) {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    query = query.offset(options.offset) as typeof query;
  }

  const results = await query;

  return { results, totalCount };
}

export async function getUserInteractionMediaKeys(db: Database, userId: number) {
  const rows = await db
    .selectDistinct({
      tmdbId: media.tmdbId,
      type: media.type,
    })
    .from(media)
    .innerJoin(userMediaInteractions, eq(media.id, userMediaInteractions.mediaId))
    .where(and(eq(userMediaInteractions.userId, userId), isNotNull(media.tmdbId)));

  return new Set(rows.map((row) => toMediaKey(row.tmdbId ?? -1, row.type)));
}

// ============================================================================
// Vote Counting & Aggregation
// ============================================================================

/**
 * Get vote counts for a specific media by internal media ID
 * Returns like count and dislike count
 */
export async function getVoteCounts(
  db: Database,
  mediaId: number,
): Promise<{ likes: number; dislikes: number }> {
  const result = await db
    .select({
      likes: sql<number>`SUM(CASE WHEN ${userMediaInteractions.action} = 'liked' THEN 1 ELSE 0 END)`,
      dislikes: sql<number>`SUM(CASE WHEN ${userMediaInteractions.action} = 'disliked' THEN 1 ELSE 0 END)`,
    })
    .from(userMediaInteractions)
    .where(eq(userMediaInteractions.mediaId, mediaId));

  const likes = result[0]?.likes ?? 0;
  const dislikes = result[0]?.dislikes ?? 0;

  return { likes, dislikes };
}
