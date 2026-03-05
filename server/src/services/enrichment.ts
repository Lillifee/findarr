import { type Media, isDefined } from '@findarr/shared';
import type { DB } from '../db/setup.js';
import type { TMDBService } from '../tmdb/service.js';
import {
  getInteractionsBatch,
  getAllInteractionsWithUsersBatch,
  getVoteCountsBatch,
} from './interaction.js';
import type { MediaDbRow } from './media.js';
import { getMediaRecordsBatch } from './media.js';

// ============================================================================
// Enrichment Utilities - Add database state to TMDB media items
// Split into separate concerns: media records and user interactions
// ============================================================================

/**
 * Enrich TMDB media items with database records (status, jellyfinId)
 *
 * @param db Database instance
 * @param mediaItems Media items from TMDB
 * @returns Media items enriched with state.record
 */
export function enrichWithRecords(db: DB, mediaItems: Media[]): Media[] {
  if (mediaItems.length === 0) return mediaItems;

  const mediaRecords = getMediaRecordsBatch(db, mediaItems);

  return mediaItems.map(item => {
    const key = `${item.id}_${item.type}`;
    const record = mediaRecords.get(key);

    if (!record) return item;

    return { ...item, state: { ...item.state, record } };
  });
}

/**
 * Enrich media items with user interactions and vote counts
 * Requires items to already have state.record with database IDs
 * Uses separate optimized batch queries for interactions and vote counts
 *
 * @param db Database instance
 * @param mediaItems Media items to enrich
 * @param userId Optional user ID. If provided, returns user-specific interactions (liked, disliked, requested).
 *               If undefined, returns all interactions with user info (for admin views)
 */
export function enrichWithInteractions(db: DB, mediaItems: Media[], userId?: number): Media[] {
  const isAdminView = userId === undefined;

  // Fetch interactions (user-specific or all with user info)
  const interactionsMap = isAdminView
    ? getAllInteractionsWithUsersBatch(db, mediaItems)
    : getInteractionsBatch(db, mediaItems, userId);

  // Fetch vote counts (always aggregated across all users)
  const votesMap = getVoteCountsBatch(db, mediaItems);

  return mediaItems.map(item => {
    const mediaId = item.state?.record?.id;
    if (!mediaId) return item;

    const interactions = interactionsMap.get(mediaId);
    const votes = votesMap.get(mediaId);

    return {
      ...item,
      state: {
        ...item.state,
        ...(interactions && { interactions }),
        ...(votes && { votes }),
      },
    };
  });
}

/**
 * Fetch TMDB details for database records
 * Returns Media items with TMDB data and database record attached
 */
export async function fetchTMDBDetails(
  tmdbService: TMDBService,
  mediaDbRows: MediaDbRow[]
): Promise<Media[]> {
  const results = await Promise.all(
    mediaDbRows.map(async ({ tmdbId, mediaType, id, status, jellyfinId, createdAt, updatedAt }) => {
      const details = await tmdbService
        .getDetails({ id: tmdbId, type: mediaType })
        .catch(() => undefined);

      // Attach database record to TMDB data
      return (
        details && {
          ...details,
          state: { record: { id, status, jellyfinId, createdAt, updatedAt } },
        }
      );
    })
  );

  return results.filter(x => isDefined(x));
}
