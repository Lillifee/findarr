import {
  catalogCache,
  isDefined,
  type DbCatalogCache,
  type Keyword,
  type Media,
  type MediaType,
} from '@findarr/shared';
import { eq, and, isNull, notInArray, or, sql } from 'drizzle-orm';

import type { Database } from '../db/service.js';
import type { MediaStats } from '../media/scoring.js';

// ============================================================================
// Catalog Cache Repository - Database operations for catalog_cache table
// ============================================================================

/**
 * Transform database row to Media object
 */
const mapCatalogCacheRowToMedia = (row: DbCatalogCache): Media => {
  const media: Media = {
    tmdbId: row.tmdbId,
    type: row.type,
    name: row.name,
    date: row.date ?? undefined,
    posterPath: row.posterPath ?? undefined,
    backdropPath: row.backdropPath ?? undefined,
    overview: row.overview ?? undefined,
    voteAverage: row.voteAverage,
    voteCount: row.voteCount,
    popularity: row.popularity,
    originalLanguage: row.originalLanguage,
    // oxlint-disable-next-line typescript/no-unsafe-assignment
    originCountry: isDefined(row.originCountry) ? JSON.parse(row.originCountry) : undefined,
    // oxlint-disable-next-line typescript/no-unsafe-assignment
    genres: JSON.parse(row.genres),
    // oxlint-disable-next-line typescript/no-unsafe-assignment
    keywords: isDefined(row.keywords) ? JSON.parse(row.keywords) : undefined,
    trendingRank: row.trendingRank ?? undefined,
  };

  return media;
};

/**
 * Transform Media object to database row values
 */
const mapMediaToCatalogCacheValues = (media: Media) => ({
  tmdbId: media.tmdbId,
  type: media.type,
  name: media.name,
  date: media.date ?? null,
  posterPath: media.posterPath ?? null,
  backdropPath: media.backdropPath ?? null,
  overview: media.overview ?? null,
  voteAverage: media.voteAverage,
  voteCount: media.voteCount,
  popularity: media.popularity,
  originalLanguage: media.originalLanguage,
  originCountry: media.originCountry ? JSON.stringify(media.originCountry) : null,
  genres: JSON.stringify(media.genres),
  keywords: media.keywords ? JSON.stringify(media.keywords) : null,
  trendingRank: media.trendingRank ?? null,
});

/**
 * Insert or update catalog cache entries (batch upsert)
 * On conflict, updates all fields EXCEPT keywords (to preserve enrichment)
 */
export const upsertCatalogCache = async (db: Database, items: Media[]): Promise<void> => {
  if (items.length === 0) {
    return;
  }

  for (const item of items) {
    const values = mapMediaToCatalogCacheValues(item);
    const { keywords: _keywords, ...updateValues } = values;

    // oxlint-disable-next-line eslint/no-await-in-loop
    await db
      .insert(catalogCache)
      .values(values)
      .onConflictDoUpdate({
        target: [catalogCache.tmdbId, catalogCache.type],
        set: updateValues,
      });
  }
};

/**
 * Get catalog cache entries by TMDB IDs (batch lookup)
 */
export const getCatalogCacheBatch = async (
  db: Database,
  mediaKeys: { tmdbId: number; type: MediaType }[],
): Promise<Media[]> => {
  if (mediaKeys.length === 0) {
    return [];
  }

  // Single query matching any of the requested (tmdbId, type) pairs.
  const rows = await db.query.catalogCache.findMany({
    where: or(
      ...mediaKeys.map((key) =>
        and(eq(catalogCache.tmdbId, key.tmdbId), eq(catalogCache.type, key.type)),
      ),
    ),
  });

  return rows.map((row) => mapCatalogCacheRowToMedia(row));
};

/**
 * Get all catalog cache entries
 */
export const getAllCatalogCache = async (db: Database): Promise<Media[]> => {
  const catalogCacheRows = (await db.query.catalogCache.findMany()) as DbCatalogCache[];
  return catalogCacheRows.map((row) => mapCatalogCacheRowToMedia(row));
};

/**
 * Delete catalog cache entries NOT in the provided list
 * Used for cleanup after syncing new popular items
 */
export const cleanupCatalogCache = async (
  db: Database,
  activeMediaKeys: { tmdbId: number; type: MediaType }[],
): Promise<number> => {
  if (activeMediaKeys.length === 0) {
    // Delete all if no current IDs provided
    const result = await db.delete(catalogCache);
    return result.changes;
  }

  let deletedCount = 0;

  for (const type of ['movie', 'tv'] as const) {
    const activeIds = activeMediaKeys
      .filter((mediaKey) => mediaKey.type === type)
      .map((mediaKey) => mediaKey.tmdbId);

    const condition =
      activeIds.length === 0
        ? eq(catalogCache.type, type)
        : and(eq(catalogCache.type, type), notInArray(catalogCache.tmdbId, activeIds));

    // oxlint-disable-next-line eslint/no-await-in-loop
    const result = await db.delete(catalogCache).where(condition);
    deletedCount += result.changes;
  }

  return deletedCount;
};

/**
 * Get catalog items that have empty keywords array
 * Used by keyword enrichment to find items that need detailed fetching
 */
export const listCatalogItemsMissingKeywords = async (
  db: Database,
): Promise<{ tmdbId: number; type: MediaType }[]> => {
  const catalogItems = await db.query.catalogCache.findMany({
    columns: {
      tmdbId: true,
      type: true,
    },
    where: isNull(catalogCache.keywords),
  });

  return catalogItems.map((row) => ({
    tmdbId: row.tmdbId,
    type: row.type as MediaType,
  }));
};

/**
 * Update keywords for a specific catalog item
 * Used by background enrichment to add keywords without refetching all data
 */
export const updateCatalogKeywords = async (
  db: Database,
  tmdbId: number,
  type: MediaType,
  keywords: Keyword[],
): Promise<void> => {
  await db
    .update(catalogCache)
    .set({ keywords: JSON.stringify(keywords) })
    .where(and(eq(catalogCache.tmdbId, tmdbId), eq(catalogCache.type, type)));
};

/**
 * Compute media statistics from catalog cache (trending + recent releases)
 * Used during catalog sync to update normalization bounds
 */
export const computeCatalogMediaStats = async (
  db: Database,
  mediaType: MediaType,
): Promise<Omit<MediaStats, 'mediaType' | 'updatedAt'>> => {
  const result = await db
    .select({
      maxPopularity: sql<number>`MAX(${catalogCache.popularity})`,
      maxVoteCount: sql<number>`MAX(${catalogCache.voteCount})`,
      avgRating: sql<number>`AVG(${catalogCache.voteAverage})`,
    })
    .from(catalogCache)
    .where(eq(catalogCache.type, mediaType));

  const [row] = result;

  // Handle case where catalog is empty for this type
  if (!row) {
    return {
      maxPopularity: 0,
      maxVoteCount: 0,
      avgRating: 0,
    };
  }

  return {
    maxPopularity: row.maxPopularity ?? 0,
    maxVoteCount: row.maxVoteCount ?? 0,
    avgRating: row.avgRating ?? 0,
  };
};
