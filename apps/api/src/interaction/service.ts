import {
  type CreateMediaInteraction,
  type User,
  type DbMedia,
  type InteractionsQuery,
  type UserInteractionsResponse,
  type MediaStatus,
  isDefined,
  type MediaDetails,
} from '@findarr/shared';

import type { AnyArrService } from '../arr/service.js';
import { getCatalogCacheBatch } from '../catalog/repository.js';
import type { CatalogService } from '../catalog/service.js';
import type { Database } from '../db/service.js';
import { fetchTMDBDetails, enrichWithInteractions } from '../media/enrichment.js';
import {
  createMedia,
  getMediaByStatusPaginated,
  getMediaByTmdbId,
  updateMediaStatus,
  updateMediaSeasons,
} from '../media/repository.js';
import { updatePreferencesForInteraction } from '../preferences/service.js';
import type { TMDBService } from '../tmdb/service.js';
import {
  addInteraction,
  hasInteraction,
  removeAllInteractions,
  getVoteCounts,
  getMediaByUserAttention,
  getMediaByUserInteractions,
} from './repository.js';

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
  data: CreateMediaInteraction,
): Promise<void> {
  const details = await tmdbService.details({ id: data.tmdbId, type: data.mediaType });

  const service = details.type === 'movie' ? radarrService : sonarrService;
  const externalId = details.type === 'movie' ? details.tmdbId : details.tvdbId;

  await service.requestMedia(
    mediaRecord.id,
    externalId,
    details.name,
    mediaRecord.arrId,
    data.seasons,
  );
}

async function enrichInteractionPage(
  tmdbService: TMDBService,
  db: Database,
  userId: number,
  items: { results: DbMedia[]; totalCount: number },
  page: number,
  limit: number,
): Promise<UserInteractionsResponse> {
  // Calculate pagination metadata
  const totalPages = Math.ceil(items.totalCount / limit);

  // Fetch TMDB details for all interacted media
  const enrichedMedia = await fetchTMDBDetails(tmdbService, items.results);

  // Add user interactions and vote counts in optimized batch query
  const results = await enrichWithInteractions(db, enrichedMedia, userId);

  return { results, page, totalPages };
}

/**
 * Update user preferences (genres and keywords) based on interaction
 * Checks catalog cache first for keywords, otherwise fetches TMDB details for genres only
 */
async function updateUserPreferences(
  tmdbService: TMDBService,
  db: Database,
  data: CreateMediaInteraction,
  userId: number,
  isToggle: boolean,
): Promise<void> {
  const [cachedItem] = await getCatalogCacheBatch(db, [
    { tmdbId: data.tmdbId, type: data.mediaType },
  ]);

  const source =
    cachedItem ??
    (await tmdbService.details({
      id: data.tmdbId,
      type: data.mediaType,
    }));

  await updatePreferencesForInteraction(
    db,
    userId,
    source.genres,
    source.keywords,
    data.action,
    isToggle,
  );
}

const LIKE_THRESHOLD = 1;

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
  db: Database,
  data: CreateMediaInteraction,
  user?: User,
): Promise<MediaDetails | undefined> => {
  if (!isDefined(user?.id)) {
    return undefined;
  }

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

  // Request media
  if ((likes >= LIKE_THRESHOLD || isAdmin) && data.action === 'liked') {
    if (media.status === 'pending') {
      // Update to requested status (trigger download workflow)
      await updateMediaStatus(db, media.id, 'requested');
    }

    // Forward to Radarr/Sonarr (handles both create and update based on arrId)
    await requestMediaToArr(tmdbService, radarrService, sonarrService, media, data);
  }

  // Update user genre preferences (fire-and-forget - don't block response)
  await updateUserPreferences(tmdbService, db, data, user.id, isToggle);

  // Return enriched media with updated state using catalog service
  return catalogService.getMediaDetails({ id: data.tmdbId, type: data.mediaType }, user.id);
};

/**
 * Get user's interacted media (likes AND dislikes) enriched with TMDB metadata, interactions, and vote counts
 * Supports pagination for better performance with large vote lists
 */
export async function getUserInteractionsEnriched(
  tmdbService: TMDBService,
  db: Database,
  userId: number,
  params?: InteractionsQuery,
): Promise<UserInteractionsResponse> {
  const { action = 'all', page = 1, type = 'both' } = params ?? {};
  const limit = 20;
  const offset = (page - 1) * limit;

  const items = await getMediaByUserInteractions(db, userId, {
    type,
    action,
    limit,
    offset,
  });

  return enrichInteractionPage(tmdbService, db, userId, items, page, limit);
}

export async function getUserActivityAttentionEnriched(
  tmdbService: TMDBService,
  db: Database,
  user: User,
  params?: InteractionsQuery,
): Promise<UserInteractionsResponse> {
  const { page = 1, type = 'both' } = params ?? {};
  const limit = 20;
  const offset = (page - 1) * limit;

  const statuses: MediaStatus[] = ['downloading', 'warning'];

  const items =
    user.role === 'admin'
      ? await getMediaByStatusPaginated(db, statuses, { limit, offset, type })
      : await getMediaByUserAttention(db, user.id, { type, statuses, limit, offset });

  return enrichInteractionPage(tmdbService, db, user.id, items, page, limit);
}
