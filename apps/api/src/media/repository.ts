import { media, mediaStats, type DbMedia } from '@findarr/shared/db';
import type { Media, MediaStatus, MediaType, SearchType, MediaRecord } from '@findarr/shared/media';
import { and, eq, or, sql } from 'drizzle-orm';

import type { Database } from '../db/service.js';
import { conflict, notFound } from '../utils/errors.js';
import type { MediaStats } from './scoring.js';

// ============================================================================
// Media Repository - Raw database operations for the media table
// ============================================================================

/**
 * Get media record by internal database ID
 */
export const getMediaById = async (db: Database, mediaId: number): Promise<DbMedia | undefined> =>
  (await db.query.media.findFirst({
    where: eq(media.id, mediaId),
  })) as DbMedia | undefined;

/**
 * Get media record by TMDB ID and type
 */
export const getMediaByTmdbId = async (
  db: Database,
  tmdbId: number,
  type: MediaType,
): Promise<DbMedia | undefined> =>
  (await db.query.media.findFirst({
    where: and(eq(media.tmdbId, tmdbId), eq(media.type, type)),
  })) as DbMedia | undefined;

/**
 * Create a new media record in the database
 * Returns the newly created record or existing record if already exists
 */
export const createMedia = async (
  db: Database,
  tmdbId: number,
  type: MediaType,
  status: MediaStatus = 'pending',
  seasonNumbers?: number[],
) => {
  // Check if media already exists (prevent duplicates since we removed the unique constraint)
  const existing = await getMediaByTmdbId(db, tmdbId, type);
  if (existing) {
    return existing;
  }

  // Convert season numbers to SeasonRecord format for storage
  const seasons = seasonNumbers
    ? seasonNumbers.map((seasonNumber) => ({ seasonNumber, status: 'requested' as const }))
    : null;

  const result = await db
    .insert(media)
    .values({
      tmdbId,
      type,
      status,
      seasons,
    })
    .returning({
      id: media.id,
    });

  if (!result[0]) {
    throw conflict('Failed to create media record');
  }

  const createdMedia = await getMediaById(db, result[0].id);
  if (!createdMedia) {
    throw conflict('Failed to create media record');
  }

  return createdMedia;
};

/**
 * Update the status of a media record
 */
export const updateMediaStatus = async (
  db: Database,
  mediaId: number,
  status: MediaStatus,
): Promise<void> => {
  const result = await db
    .update(media)
    .set({
      status,
      updatedAt: Date.now(),
    })
    .where(eq(media.id, mediaId));

  if (result.changes === 0) {
    throw notFound('Media not found');
  }
};

/**
 * Update the seasons for a TV show media record
 * Converts season numbers to SeasonRecord format with monitored=true
 */
export const updateMediaSeasons = async (
  db: Database,
  mediaId: number,
  seasonNumbers: number[] | null,
): Promise<void> => {
  const seasons = seasonNumbers
    ? seasonNumbers.map((seasonNumber) => ({ seasonNumber, status: 'requested' as const }))
    : null;

  const result = await db
    .update(media)
    .set({
      seasons,
      updatedAt: Date.now(),
    })
    .where(eq(media.id, mediaId));

  if (result.changes === 0) {
    throw notFound('Media not found');
  }
};

/**
 * Batch query for media records by TMDB IDs and types
 * Used for enriching multiple media items at once
 */
export async function getMediaRecordsBatch(
  db: Database,
  mediaItems: Media[],
): Promise<Map<string, MediaRecord>> {
  const mediaRecords = new Map<string, MediaRecord>();
  if (mediaItems.length === 0) {
    return mediaRecords;
  }

  // Build OR conditions for batch query
  const conditions = mediaItems.map((item) =>
    and(eq(media.tmdbId, item.tmdbId), eq(media.type, item.type)),
  );

  const rows = await db.query.media.findMany({
    columns: {
      id: true,
      type: true,
      tmdbId: true,
      tvdbId: true,
      arrId: true,
      arrUrl: true,
      status: true,
      libId: true,
      libUrl: true,
      libAddedAt: true,
      seasons: true,
      createdAt: true,
      updatedAt: true,
    },
    where: or(...conditions),
  });

  for (const row of rows) {
    const key = `${row.tmdbId}_${row.type}`;
    mediaRecords.set(key, {
      id: row.id,
      arrId: row.arrId,
      arrUrl: row.arrUrl,
      tvdbId: row.tvdbId,
      libId: row.libId,
      libUrl: row.libUrl,
      libAddedAt: row.libAddedAt,
      seasons: row.seasons,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  return mediaRecords;
}

export async function getMediaByStatusPaginated(
  db: Database,
  statuses: MediaStatus[],
  options: {
    limit: number;
    offset: number;
    type?: SearchType;
  },
): Promise<{ results: DbMedia[]; totalCount: number }> {
  if (statuses.length === 0) {
    return { results: [], totalCount: 0 };
  }

  const statusConditions = statuses.map((status) => eq(media.status, status));
  const whereClause =
    options.type && options.type !== 'both'
      ? and(or(...statusConditions), eq(media.type, options.type))
      : or(...statusConditions);

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(media)
    .where(whereClause);

  const results = await db.query.media.findMany({
    columns: {
      id: true,
      type: true,
      tmdbId: true,
      tvdbId: true,
      arrId: true,
      arrUrl: true,
      status: true,
      libId: true,
      libUrl: true,
      libAddedAt: true,
      seasons: true,
      createdAt: true,
      updatedAt: true,
    },
    where: whereClause,
    orderBy: (x, { desc }) => [desc(x.libAddedAt)],
    limit: options.limit,
    offset: options.offset,
  });

  return {
    results,
    totalCount: countResult[0]?.count ?? 0,
  };
}

// ============================================================================
// Media Stats Repository - Database operations for media statistics
// Stores MediaStats in media_stats table (computed from catalog cache)
// ============================================================================

/**
 * Default TMDB stat bounds for initial seeding
 * Based on trending + popular fixtures (last updated: April 2026)
 * Run the "should compute stats from real fixtures" test to regenerate these values
 */
const TMDB_STAT_DEFAULTS = {
  maxPopularity: 1319,
  maxVoteCount: 10_935,
  avgRating: 7,
};

/**
 * Seed media stats with default values if table is empty
 * Only runs once on first startup before catalog sync
 */
export const seedMediaStats = async (db: Database): Promise<void> => {
  const existing = await db.select().from(mediaStats);

  if (existing.length === 0) {
    const now = Date.now();
    await db.insert(mediaStats).values([
      { mediaType: 'movie', ...TMDB_STAT_DEFAULTS, updatedAt: now },
      { mediaType: 'tv', ...TMDB_STAT_DEFAULTS, updatedAt: now },
    ]);
  }
};

/**
 * Get media stats for both movie and TV
 * Returns Map for O(1) lookup by media type
 */
export const getMediaStats = async (db: Database): Promise<Map<MediaType, MediaStats>> => {
  const rows = await db.select().from(mediaStats);

  const statsMap = new Map<MediaType, MediaStats>();
  for (const row of rows) {
    statsMap.set(row.mediaType, row as MediaStats);
  }

  return statsMap;
};

/**
 * Update media stats with growth strategy
 * Maximums only increase, minimums only decrease over time
 * Uses SQL GREATEST/LEAST to accumulate extremes
 */
export const upsertMediaStats = async (
  db: Database,
  mediaType: MediaType,
  stats: Omit<MediaStats, 'mediaType' | 'updatedAt'>,
): Promise<void> => {
  const now = Date.now();

  await db
    .insert(mediaStats)
    .values({
      mediaType,
      maxPopularity: stats.maxPopularity,
      maxVoteCount: stats.maxVoteCount,
      avgRating: stats.avgRating,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: mediaStats.mediaType,
      set: {
        // Growth strategy: max values only increase, min values only decrease
        maxPopularity: sql`MAX(${mediaStats.maxPopularity}, ${stats.maxPopularity})`,
        maxVoteCount: sql`MAX(${mediaStats.maxVoteCount}, ${stats.maxVoteCount})`,
        avgRating: stats.avgRating,
        updatedAt: now,
      },
    });
};
