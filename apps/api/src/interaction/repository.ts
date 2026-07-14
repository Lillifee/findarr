import { media, users, userMediaInteractions, type DbMedia } from '@findarr/shared/db';
import type { InteractionsQuery, InteractionType } from '@findarr/shared/interaction';
import type { Media, MediaStatus, MediaInteractionWithUser } from '@findarr/shared/media';
import { isDefined } from '@findarr/shared/utils';
import { and, eq, getTableColumns, inArray, isNotNull, sql } from 'drizzle-orm';

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
 * Batch query for ALL interactions (any user) on the given media items, joined with basic
 * user info. Single query used to derive both "my own interaction" and, for admins, "who
 * liked" each item — avoids querying per-user and per-media separately.
 */
export async function getInteractionsBatch(
  db: Database,
  mediaItems: Media[],
): Promise<Map<number, MediaInteractionWithUser[]>> {
  const interactionsMap = new Map<number, MediaInteractionWithUser[]>();

  const mediaIds = mediaItems.map((item) => item.state?.record?.id).filter((x) => isDefined(x));
  if (mediaIds.length === 0) {
    return interactionsMap;
  }

  const rows = await db
    .select({
      id: userMediaInteractions.id,
      mediaId: userMediaInteractions.mediaId,
      action: userMediaInteractions.action,
      createdAt: userMediaInteractions.createdAt,
      userId: users.id,
      email: users.email,
      displayName: users.displayName,
      userCreatedAt: users.createdAt,
    })
    .from(userMediaInteractions)
    .innerJoin(users, eq(userMediaInteractions.userId, users.id))
    .where(inArray(userMediaInteractions.mediaId, mediaIds));

  for (const row of rows) {
    const interactions = interactionsMap.get(row.mediaId) ?? [];
    interactions.push({
      id: row.id,
      action: row.action,
      createdAt: row.createdAt,
      user: {
        id: row.userId,
        email: row.email,
        displayName: row.displayName,
        createdAt: row.userCreatedAt,
      },
    });
    interactionsMap.set(row.mediaId, interactions);
  }

  return interactionsMap;
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
    .select(getTableColumns(media))
    .from(media)
    .innerJoin(userMediaInteractions, eq(media.id, userMediaInteractions.mediaId))
    .where(whereClause)
    .groupBy(media.id)
    .orderBy(sql`MAX(${userMediaInteractions.createdAt}) DESC`)
    .$dynamic();

  if (options.limit !== undefined) {
    query = query.limit(options.limit);
  }
  if (options.offset !== undefined) {
    query = query.offset(options.offset);
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
    .select(getTableColumns(media))
    .from(media)
    .innerJoin(userMediaInteractions, eq(media.id, userMediaInteractions.mediaId))
    .where(whereClause)
    .groupBy(media.id)
    .orderBy(sql`MAX(${userMediaInteractions.createdAt}) DESC`)
    .$dynamic();

  if (options.limit !== undefined) {
    query = query.limit(options.limit);
  }
  if (options.offset !== undefined) {
    query = query.offset(options.offset);
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
