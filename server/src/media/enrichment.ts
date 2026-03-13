import { type Media, isDefined } from '@findarr/shared';
import type { DB } from '../db/setup.js';
import {
  getInteractionsBatch,
  getAllInteractionsWithUsersBatch,
  getVoteCountsBatch,
} from '../interaction/repository.js';
import type { TMDBService } from '../tmdb/service.js';
import type { MediaDbRow } from './repository.js';
import { getMediaRecordsBatch } from './repository.js';

// ============================================================================
// Enrichment Utilities - Add database state to TMDB media items
// Split into separate concerns: media records and user interactions
// ============================================================================

/**
 * Enrich TMDB media items with database records (status, jellyfinId)
 */
export async function enrichWithRecords(db: DB, mediaItems: Media[]): Promise<Media[]> {
  if (mediaItems.length === 0) return mediaItems;

  const mediaRecords = await getMediaRecordsBatch(db, mediaItems);

  return mediaItems.map(item => {
    const key = `${item.tmdbId}_${item.type}`;
    const record = mediaRecords.get(key);

    if (!record) return item;

    return { ...item, state: { ...item.state, record } };
  });
}

/**
 * Enrich media items with user interactions and vote counts
 * Requires items to already have state.record with database IDs
 * Uses separate optimized batch queries for interactions and vote counts
 */
export async function enrichWithInteractions(
  db: DB,
  mediaItems: Media[],
  userId?: number
): Promise<Media[]> {
  const isAdminView = userId === undefined;

  // Fetch interactions (user-specific or all with user info)
  const interactionsMap = isAdminView
    ? await getAllInteractionsWithUsersBatch(db, mediaItems)
    : await getInteractionsBatch(db, mediaItems, userId);

  // Fetch vote counts (always aggregated across all users)
  const votesMap = await getVoteCountsBatch(db, mediaItems);

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
    mediaDbRows.map(async ({ tmdbId, type, id, status, jellyfinId, createdAt, updatedAt }) => {
      const details = await tmdbService.getDetails({ id: tmdbId, type }).catch(() => undefined);

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
