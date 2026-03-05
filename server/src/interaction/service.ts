import { type CreateMediaInteraction, type Media, type User } from '@findarr/shared';
import type { DB } from '../db/setup.js';
import { fetchTMDBDetails, enrichWithInteractions } from '../media/enrichment.js';
import {
  createMedia,
  getMediaById,
  getMediaByTmdbId,
  updateMediaStatus,
} from '../media/repository.js';
import type { TMDBService } from '../tmdb/service.js';
import {
  addInteraction,
  hasInteraction,
  removeAllInteractions,
  getVoteCounts,
  getMediaByUserInteractions,
  getAllMediaWithInteractions,
} from './repository.js';

const LIKE_THRESHOLD = 3;

/**
 * Create or toggle a media interaction (like/dislike)
 * Automatically creates media request when vote threshold is met (3 votes) or if admin likes it
 */
export const createInteraction = (db: DB, data: CreateMediaInteraction, user?: User) => {
  if (!user?.id) return;

  // Start transaction
  const transaction = db.transaction(() => {
    // Get or create media record
    const media =
      getMediaByTmdbId(db, data.tmdbId, data.mediaType) ??
      createMedia(db, data.tmdbId, data.mediaType);

    // Check if this is a toggle (user clicking same action twice to remove it)
    const isToggle = hasInteraction(db, user.id, media.id, data.action);

    // Remove all existing interactions for this user on this media
    removeAllInteractions(db, user.id, media.id);

    // Add new interaction only if not toggling off
    if (!isToggle) {
      addInteraction(db, user.id, media.id, data.action);
    }

    // Calculate votes and check if auto-request threshold is met
    const { likes } = getVoteCounts(db, media.id);
    const isAdmin = user.role === 'admin';

    // Auto-request if: admin liked it OR net votes >= 3
    if ((likes >= LIKE_THRESHOLD || isAdmin) && data.action === 'liked') {
      const currentMedia = getMediaById(db, media.id);
      if (currentMedia && currentMedia.status === 'pending') {
        // Update to requested status (trigger download workflow)
        updateMediaStatus(db, media.id, 'requested');
      }
    }

    // Return the updated media record
    return getMediaById(db, media.id);
  });

  return transaction();
};

/**
 * Get user's interacted media (likes AND dislikes) enriched with TMDB metadata, interactions, and vote counts
 */
export async function getUserInteractionsEnriched(
  tmdbService: TMDBService,
  db: DB,
  userId?: number
): Promise<Media[]> {
  if (!userId) return [];

  // Get all media where user has any interaction (liked or disliked)
  const dbRecords = getMediaByUserInteractions(db, userId);

  // Fetch TMDB details for all interacted media
  const enrichedMedia = await fetchTMDBDetails(tmdbService, dbRecords);

  // Add user interactions and vote counts in optimized batch query
  return enrichWithInteractions(db, enrichedMedia, userId);
}

/**
 * Get all media with interactions enriched with TMDB metadata, all user interactions, and vote counts (admin view)
 */
export async function getAllInteractionsEnriched(
  tmdbService: TMDBService,
  db: DB
): Promise<Media[]> {
  // Get all media that has at least one interaction (any status: pending, requested, available)
  const dbRecords = getAllMediaWithInteractions(db);

  if (dbRecords.length === 0) return [];

  // Fetch TMDB details for all media with interactions
  const enrichedMedia = await fetchTMDBDetails(tmdbService, dbRecords);

  // Add all interactions with user info and vote counts in optimized batch queries
  return enrichWithInteractions(db, enrichedMedia);
}
