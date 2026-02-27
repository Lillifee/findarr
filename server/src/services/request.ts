import type { CreateMediaRequest, RequestStatus, Media } from '@findarr/shared';
import type { DB } from '../db/setup.js';
import type { TMDBService } from '../tmdb/service.js';
import { Conflict, Forbidden, NotFound } from '../utils/errors.js';
import { fetchTMDBDetails, addInteractions, addAllInteractions } from './enrichment.js';
import { addInteraction, hasInteraction } from './interactions.js';
import {
  type MediaDbRow,
  getMediaById,
  getMediaByTmdbId,
  createMedia,
  updateMediaStatus,
} from './media.js';

// ============================================================================
// Request Service - User request workflow and business logic
// Uses mediaRepository for database operations and interactions for tracking
// ============================================================================

// ============================================================================
// Create Operations
// ============================================================================

export const createRequest = (db: DB, data: CreateMediaRequest, userId?: number) => {
  if (!userId) return;

  // Start transaction
  const transaction = db.transaction(() => {
    // Check if media already exists
    let mediaId: number;
    const existingMedia = getMediaByTmdbId(db, data.tmdbId, data.mediaType);

    if (existingMedia) {
      mediaId = existingMedia.id;

      // Check if this user already requested it
      if (hasInteraction(db, userId, mediaId, 'requested')) {
        throw Conflict('You have already requested this media');
      }
    } else {
      // Create new media entry
      mediaId = createMedia(db, data.tmdbId, data.mediaType, 'pending');
    }

    // Add interaction
    addInteraction(db, userId, mediaId, 'requested');

    // Return the media with interaction info
    return getMediaById(db, mediaId);
  });

  return transaction();
};

// ============================================================================
// Update Operations
// ============================================================================

export const updateRequestStatus = (db: DB, mediaId: number, status: RequestStatus): void => {
  updateMediaStatus(db, mediaId, status);
};

// ============================================================================
// Read / Query Operations
// ============================================================================

// Get all media that the user has requested
export const getUserRequests = (db: DB, userId?: number) =>
  userId
    ? db
        .prepare<[number], MediaDbRow>(
          `
          SELECT m.*
          FROM media m
          INNER JOIN user_media_interactions i ON m.id = i.mediaId
          WHERE i.userId = ? AND i.action = 'requested'
          ORDER BY i.createdAt DESC
          `
        )
        .all(userId)
    : undefined;

// Get all media that has been requested (for admin view)
export const getAllRequests = (db: DB): MediaDbRow[] =>
  db
    .prepare<[], MediaDbRow>(
      `
      SELECT DISTINCT m.*
      FROM media m
      INNER JOIN user_media_interactions i ON m.id = i.mediaId
      WHERE i.action = 'requested'
      ORDER BY m.createdAt DESC
    `
    )
    .all();

export const getUserRequestById = (
  db: DB,
  mediaId: number,
  userId?: number,
  userRole?: string
): MediaDbRow => {
  const media = getMediaById(db, mediaId);

  if (!media) {
    throw NotFound('Request not found');
  }

  // Check if user has requested this media
  if (userId && !hasInteraction(db, userId, mediaId, 'requested') && userRole !== 'admin') {
    throw Forbidden('Access denied');
  }

  return media;
};

// ============================================================================
// Enriched Query Operations - Include TMDB metadata
// ============================================================================

/**
 * Get user's requests enriched with TMDB metadata and interactions
 */
export async function getUserRequestsEnriched(
  tmdbService: TMDBService,
  db: DB,
  userId?: number
): Promise<Media[]> {
  const dbRecords = getUserRequests(db, userId);
  if (!dbRecords) return [];

  // Fetch TMDB details for all requests
  const enrichedMedia = await fetchTMDBDetails(tmdbService, dbRecords);

  // Add user interactions
  return userId ? addInteractions(db, enrichedMedia, userId) : enrichedMedia;
}

/**
 * Get all requests enriched with TMDB metadata and all user interactions
 */
export async function getAllRequestsEnriched(tmdbService: TMDBService, db: DB): Promise<Media[]> {
  const dbRecords = getAllRequests(db);
  if (dbRecords.length === 0) return [];

  // Fetch TMDB details for all requests
  const enrichedMedia = await fetchTMDBDetails(tmdbService, dbRecords);

  // Add all interactions with user info (admin view shows who requested what)
  return addAllInteractions(db, enrichedMedia);
}
