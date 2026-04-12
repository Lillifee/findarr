import type { CreateMediaInteraction, Media, MediaStatus, User, DbMedia } from '@findarr/shared';
import type { AnyArrService } from '../arr/service.js';
import { getCatalogCacheBatch } from '../catalog/repository.js';
import type { CatalogService } from '../catalog/service.js';
import type { DB } from '../db/setup.js';
import { fetchTMDBDetails, enrichWithInteractions } from '../media/enrichment.js';
import {
  createMedia,
  getMediaById,
  getMediaByTmdbId,
  updateMediaStatus,
  updateMediaSeasons,
  getMediaByStatus,
} from '../media/repository.js';
import { updatePreferencesForInteraction } from '../preferences/service.js';
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
 * Stores user genre preferences for personalized scoring
 * Returns enriched media with updated state (TMDB + DB + interactions + votes)
 */
export const createInteraction = async (
  tmdbService: TMDBService,
  radarrService: AnyArrService,
  sonarrService: AnyArrService,
  catalogService: CatalogService,
  db: DB,
  data: CreateMediaInteraction,
  user?: User
): Promise<Media | undefined> => {
  if (!user?.id) return;

  // Get or create media record
  const existing = await getMediaByTmdbId(db, data.tmdbId, data.mediaType);
  const media =
    existing ?? (await createMedia(db, data.tmdbId, data.mediaType, 'pending', data.seasons));

  // Update seasons if provided (TV shows only)
  if (data.mediaType === 'tv' && data.seasons !== undefined) {
    await updateMediaSeasons(db, media.id, data.seasons);
  }

  // Determine if this is a toggle vs an update:
  // - Toggle: clicking same action without seasons (movies or direct button click)
  // - Update: providing seasons array (TV shows via modal confirmation)
  const isSeasonUpdate = data.seasons !== undefined;
  const isToggle = !isSeasonUpdate && (await hasInteraction(db, user.id, media.id, data.action));

  // Handle empty season selection as "unlike" (user deselected all seasons)
  const isUnlike = isSeasonUpdate && data.seasons?.length === 0;

  // Remove all existing interactions for this user on this media
  await removeAllInteractions(db, user.id, media.id);

  // Add new interaction unless toggling off or unliking with empty seasons
  if (!isToggle && !isUnlike) {
    await addInteraction(db, user.id, media.id, data.action);
  }

  // Calculate votes and check if auto-request threshold is met
  const { likes } = await getVoteCounts(db, media.id);
  const isAdmin = user.role === 'admin';

  // Auto-request if: admin liked it OR net votes >= 3
  if ((likes >= LIKE_THRESHOLD || isAdmin) && data.action === 'liked') {
    const currentMedia = await getMediaById(db, media.id);
    if (currentMedia && currentMedia.status === 'pending') {
      // Update to requested status (trigger download workflow)
      await updateMediaStatus(db, media.id, 'requested');
    }
    // Forward to Radarr/Sonarr (handles both create and update based on arrId)
    if (currentMedia) {
      await requestMediaToArr(tmdbService, radarrService, sonarrService, currentMedia, data);
    }
  }

  // Update user genre preferences (fire-and-forget - don't block response)
  await updateUserPreferences(tmdbService, db, data, user.id, isToggle);

  // Return enriched media with updated state using catalog service
  return catalogService.getDetails({ id: data.tmdbId, type: data.mediaType }, user.id);
};

/**
 * Update user preferences (genres and keywords) based on interaction
 * Checks catalog cache first for keywords, otherwise fetches TMDB details for genres only
 */
async function updateUserPreferences(
  tmdbService: TMDBService,
  db: DB,
  data: CreateMediaInteraction,
  userId: number,
  isToggle: boolean
): Promise<void> {
  const [cachedItem] = await getCatalogCacheBatch(db, [
    { tmdbId: data.tmdbId, type: data.mediaType },
  ]);

  const source =
    cachedItem ??
    (await tmdbService.getDetails({
      id: data.tmdbId,
      type: data.mediaType,
    }));

  await updatePreferencesForInteraction(
    db,
    userId,
    source.genres,
    source.keywords,
    data.action,
    isToggle
  );
}

/**
 * Forward a media request to Radarr (movies) or Sonarr (TV shows).
 * Automatically handles both creating new media and updating existing media.
 * For existing media with arrId, updates monitored seasons instead of creating duplicate.
 * Resolves title from TMDB, fetches TVDB ID for TV shows if needed.
 * Stores Radarr/Sonarr IDs immediately for tracking if the service is configured.
 * Triggers fast queue sync scheduler to detect when download starts.
 * If Radarr/Sonarr is not configured, this is a no-op (gracefully skipped).
 */
async function requestMediaToArr(
  tmdbService: TMDBService,
  radarrService: AnyArrService,
  sonarrService: AnyArrService,
  mediaRecord: DbMedia,
  data: CreateMediaInteraction
): Promise<void> {
  const details = await tmdbService.getDetails({ id: data.tmdbId, type: data.mediaType });

  const service = details.type === 'movie' ? radarrService : sonarrService;
  const externalId = details.type === 'movie' ? details.tmdbId : details.tvdbId;

  await service.request(mediaRecord.id, externalId, details.name, mediaRecord.arrId, data.seasons);
}

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
  const dbRecords = await getMediaByUserInteractions(db, userId);

  // Fetch TMDB details for all interacted media
  const enrichedMedia = await fetchTMDBDetails(tmdbService, dbRecords);

  // Add user interactions and vote counts in optimized batch query
  return await enrichWithInteractions(db, enrichedMedia, userId);
}

/**
 * Get all media with interactions enriched with TMDB metadata, all user interactions, and vote counts (admin view)
 */
export async function getAllInteractionsEnriched(
  tmdbService: TMDBService,
  db: DB
): Promise<Media[]> {
  // Get all media that has at least one interaction (any status: pending, requested, available)
  const dbRecords = await getAllMediaWithInteractions(db);

  if (dbRecords.length === 0) return [];

  // Fetch TMDB details for all media with interactions
  const enrichedMedia = await fetchTMDBDetails(tmdbService, dbRecords);

  // Add all interactions with user info and vote counts in optimized batch queries
  return await enrichWithInteractions(db, enrichedMedia);
}

/**
 * Get requested media enriched with TMDB metadata
 * Optionally filter by specific statuses (requested, downloading, downloaded)
 */
export async function getRequestedMedia(
  tmdbService: TMDBService,
  db: DB,
  statuses?: MediaStatus[]
): Promise<Media[]> {
  // Default to all "in-progress" statuses if not specified
  const statusFilter = statuses ?? ['requested', 'downloading', 'downloaded'];

  // Get media records by status
  const dbRecords = await getMediaByStatus(db, statusFilter);

  if (dbRecords.length === 0) return [];

  // Fetch TMDB details for all requested media
  const enrichedMedia = await fetchTMDBDetails(tmdbService, dbRecords);

  // Add interactions and vote counts in optimized batch queries
  return await enrichWithInteractions(db, enrichedMedia);
}
