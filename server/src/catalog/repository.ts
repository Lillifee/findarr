import type { Media, Genre, Keyword, DbCatalogCache, MediaType } from '@findarr/shared';
import { catalogCache } from '@findarr/shared';
import { eq, and, isNull, sql } from 'drizzle-orm';
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
    originCountry: row.originCountry ? JSON.parse(row.originCountry) : undefined,
    genres: JSON.parse(row.genres) as Genre[],
    trendingRank: row.trendingRank ?? undefined,
  };

  // Only include keywords if they exist (null = not yet fetched)
  if (row.keywords) {
    media.keywords = JSON.parse(row.keywords) as Keyword[];
  }

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
  if (items.length === 0) return;

  // SQLite doesn't support batch upsert, so we need to do individual upserts
  for (const item of items) {
    const values = mapMediaToCatalogCacheValues(item);
    const { keywords: _keywords, ...updateValues } = values; // Exclude keywords from updates

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
  mediaKeys: Array<{ tmdbId: number; type: MediaType }>
): Promise<Media[]> => {
  if (mediaKeys.length === 0) return [];

  // Build query for multiple ID/type combinations
  const catalogCacheRows: DbCatalogCache[] = [];

  for (const { tmdbId, type } of mediaKeys) {
    const row = await db.query.catalogCache.findFirst({
      where: and(eq(catalogCache.tmdbId, tmdbId), eq(catalogCache.type, type)),
    });
    if (row) catalogCacheRows.push(row as DbCatalogCache);
  }

  return catalogCacheRows.map(row => mapCatalogCacheRowToMedia(row));
};

/**
 * Get all catalog cache entries
 */
export const getAllCatalogCache = async (db: Database): Promise<Media[]> => {
  const catalogCacheRows = (await db.query.catalogCache.findMany()) as DbCatalogCache[];
  return catalogCacheRows.map(row => mapCatalogCacheRowToMedia(row));
};

/**
 * Delete catalog cache entries NOT in the provided list
 * Used for cleanup after syncing new popular items
 */
export const cleanupCatalogCache = async (
  db: Database,
  activeMediaKeys: Array<{ tmdbId: number; type: MediaType }>
): Promise<number> => {
  if (activeMediaKeys.length === 0) {
    // Delete all if no current IDs provided
    const result = await db.delete(catalogCache);
    return result.changes;
  }

  // For SQLite, we need to do this differently since we can't easily use NOT IN with composite keys
  // Get all existing entries
  const allEntries = await db.query.catalogCache.findMany();

  // Find entries to delete (those not in the active catalog set)
  const entriesToDelete = allEntries.filter(
    entry =>
      !activeMediaKeys.some(
        mediaKey => mediaKey.tmdbId === entry.tmdbId && mediaKey.type === entry.type
      )
  );

  // Delete each entry
  let deletedCount = 0;
  for (const entry of entriesToDelete) {
    await db
      .delete(catalogCache)
      .where(and(eq(catalogCache.tmdbId, entry.tmdbId), eq(catalogCache.type, entry.type)));
    deletedCount++;
  }

  return deletedCount;
};

/**
 * Get catalog items that have empty keywords array
 * Used by keyword enrichment to find items that need detailed fetching
 */
export const listCatalogItemsMissingKeywords = async (
  db: Database
): Promise<Array<{ tmdbId: number; type: MediaType }>> => {
  const catalogItems = await db.query.catalogCache.findMany({
    columns: {
      tmdbId: true,
      type: true,
    },
    where: isNull(catalogCache.keywords),
  });

  return catalogItems.map(row => ({
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
  keywords: Keyword[]
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
  mediaType: MediaType
): Promise<Omit<MediaStats, 'mediaType' | 'updatedAt'>> => {
  const result = await db
    .select({
      maxPopularity: sql<number>`MAX(${catalogCache.popularity})`,
      maxVoteCount: sql<number>`MAX(${catalogCache.voteCount})`,
      avgRating: sql<number>`AVG(${catalogCache.voteAverage})`,
    })
    .from(catalogCache)
    .where(eq(catalogCache.type, mediaType));

  const row = result[0];

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
